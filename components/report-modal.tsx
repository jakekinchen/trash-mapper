"use client"

import type React from "react"
import Image from "next/image"
import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Camera, Upload, X, Check, Loader2, AlertCircle } from "lucide-react"
import Webcam from "react-webcam"

// Define AND EXPORT a more specific type for the submitted data
export interface ReportSubmitData {
  location: [number, number];
  description?: string;
  severity: number;
  imageFile: File | null;
}

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: ReportSubmitData) => void
  userLocation: [number, number] | null
  isSubmitting?: boolean;
  isSuccess?: boolean;
  validationError?: string | null;
  onClearValidationError?: () => void;
}

export default function ReportModal({ isOpen, onClose, onSubmit, userLocation, isSubmitting, isSuccess, validationError, onClearValidationError }: ReportModalProps) {
  // *** DEBUG LOG 4 ***
  console.log('[ReportModal] Rendering with validationError prop:', validationError);

  const [image, setImage] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [description, setDescription] = useState("")
  const [severity, setSeverity] = useState([3]) // 1-5 scale
  const [isCapturing, setIsCapturing] = useState(false)
  const webcamRef = useRef<Webcam>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (imageFile && onClearValidationError) {
      onClearValidationError();
    }
  }, [imageFile, onClearValidationError]);

  const startCamera = async () => {
    if (onClearValidationError) onClearValidationError();
    try {
      setIsCapturing(true)
    } catch (err) {
      console.error("Error starting camera:", err)
      alert("Could not access camera. Please check permissions or try uploading an image instead.")
    }
  }

  const captureImage = () => {
    if (onClearValidationError) onClearValidationError();
    try {
      if (webcamRef.current) {
        const imageSrc = webcamRef.current.getScreenshot()
        if (imageSrc) {
          setImage(imageSrc)
          setIsCapturing(false) // <-- Hide camera and show preview after capture
          // Convert base64 to file
          fetch(imageSrc)
            .then(res => res.blob())
            .then(blob => {
              const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' })
              setImageFile(file)
            })
        }
      }
    } catch (error) {
      console.error("Error capturing image:", error)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onClearValidationError) onClearValidationError();
    try {
      const file = e.target.files?.[0]
      if (file) {
        setImageFile(file); // Store the file object
        const reader = new FileReader()
        reader.onload = (event) => {
          if (event.target?.result) {
            setImage(event.target.result as string) // Set preview
          }
        }
        reader.onerror = () => {
          console.error("Error reading file")
        }
        reader.readAsDataURL(file)
      }
    } catch (error) {
      console.error("Error uploading file:", error)
    }
  }

  const handleSubmit = () => {
    if (onClearValidationError) onClearValidationError();
    try {
      if (!imageFile) {
        alert("Please select or capture an image.");
        return;
      }
      
      const submitData: ReportSubmitData = {
        location: userLocation || [-97.7431, 30.2672],
        description,
        severity: severity[0],
        imageFile: imageFile,
      };
      onSubmit(submitData)

    } catch (error) {
      console.error("Error submitting form:", error)
    }
  }

  const handleClose = () => {
    try {
      setIsCapturing(false)
      setImage(null)
      setImageFile(null)
      setDescription("")
      setSeverity([3])
      onClose()
    } catch (error) {
      console.error("Error closing modal:", error)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-w-[95vw] p-4 sm:p-6 max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report Pollution</DialogTitle>
          <DialogDescription>
            Take a photo or upload an image of the pollution you want to report.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            {validationError && (
                <div className="p-3 text-sm bg-red-100 text-red-700 border border-red-200 rounded-md flex items-start">
                    <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
                    <span>{validationError} Please try a different image.</span>
                </div>
            )}
            {isCapturing ? (
              <div className="relative bg-black rounded-md overflow-hidden h-48 sm:h-64">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{
                    facingMode: "environment",
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                  }}
                  className="w-full h-full object-cover"
                  style={{ backgroundColor: 'black' }}
                />
                <Button
                  onClick={captureImage}
                  className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-6 py-2 text-base z-10"
                  variant="secondary"
                  disabled={isSubmitting}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Capture
                </Button>
              </div>
            ) : image ? (
              <div className="relative w-full h-48 sm:h-64">
                <Image
                  src={image}
                  alt="Captured pollution"
                  fill
                  style={{ objectFit: "cover" }}
                  className="rounded-md"
                  sizes="(max-width: 640px) 100vw, 500px"
                />
                {validationError && (
                    <>
                        {/* --- TEMPORARY DEBUG LOG --- */}
                        {console.log('[ReportModal] >>> Rendering Image Overlay because validationError is:', validationError)}
                        <div className="absolute inset-0 bg-red-500/40 flex items-center justify-center rounded-md z-20">
                            <AlertCircle className="h-10 w-10 text-white" />
                        </div>
                    </>
                )}
                <Button
                  onClick={() => {
                    setImage(null);
                    setImageFile(null);
                    if (onClearValidationError) onClearValidationError();
                  }}
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 z-30"
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={startCamera} variant="outline" disabled={isSubmitting}>
                  <Camera className="mr-2 h-4 w-4" />
                  Take Photo
                </Button>
                <div className="relative">
                  <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full" disabled={isSubmitting}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Image
                  </Button>
                  <Input 
                    ref={fileInputRef} 
                    type="file" 
                    accept="image/jpeg, image/png, image/webp"
                    onChange={handleFileUpload} 
                    className="hidden" 
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional: Describe the pollution..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting || isSuccess}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="severity">Severity (1-5)</Label>
            <Slider
              id="severity"
              max={5}
              min={1}
              step={1}
              value={severity}
              onValueChange={setSeverity}
              className="w-full"
              disabled={isSubmitting || isSuccess}
            />
            <div className="text-sm text-muted-foreground text-center">
              {severity[0] === 1 && "Minor - Small amount of litter"}
              {severity[0] === 2 && "Low - Scattered litter"}
              {severity[0] === 3 && "Medium - Noticeable accumulation"}
              {severity[0] === 4 && "High - Significant pollution"}
              {severity[0] === 5 && "Severe - Hazardous/Large-scale"}
            </div>
          </div>

          {userLocation ? (
            <div className="text-sm text-muted-foreground">
              Location: {userLocation[1].toFixed(6)}, {userLocation[0].toFixed(6)}
            </div>
          ) : (
            <div className="text-sm text-amber-500">
              Using default location. Enable location services for precise reporting.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleClose} 
            className="touch-target" 
            disabled={isSubmitting || isSuccess}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!imageFile || isSubmitting || isSuccess || !!validationError}
            className={`touch-target ${isSuccess ? 'bg-green-600 hover:bg-green-700' : 'bg-primary hover:bg-primary/90'} disabled:bg-gray-400 disabled:opacity-70 disabled:cursor-not-allowed`}
          >
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
            ) : isSuccess ? (
              <><Check className="mr-2 h-4 w-4" /> Submitted!</>
            ) : (
              'Submit Report'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
