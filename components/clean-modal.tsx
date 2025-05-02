"use client"

import type React from "react"
import Image from "next/image"
import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Camera, Upload, X, Check, Loader2, AlertCircle } from "lucide-react"
import Webcam from "react-webcam"
import { useToast } from "@/components/ui/use-toast"

interface CleanModalProps {
  isOpen: boolean
  onClose: () => void
  reportId: string | null // ID of the report being cleaned
}

export default function CleanModal({ isOpen, onClose, reportId }: CleanModalProps) {
  const { toast } = useToast()
  const [image, setImage] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isCapturing, setIsCapturing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const webcamRef = useRef<Webcam>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const startCamera = async () => {
    setError(null) // Clear previous errors
    setIsCapturing(true)
    // Basic camera start, error handling can be added if needed
  }

  const captureImage = () => {
    setError(null)
    try {
      if (webcamRef.current) {
        const imageSrc = webcamRef.current.getScreenshot()
        if (imageSrc) {
          setImage(imageSrc)
          setIsCapturing(false)
          fetch(imageSrc)
            .then(res => res.blob())
            .then(blob => {
              const file = new File([blob], `clean-capture-${Date.now()}.jpg`, { type: 'image/jpeg' })
              setImageFile(file)
            })
        }
      }
    } catch (err) {
      console.error("Error capturing image:", err)
      setError("Failed to capture image.")
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    try {
      const file = e.target.files?.[0]
      if (file) {
        // Basic type validation (can be expanded)
        if (!file.type.startsWith('image/')) {
          setError('Invalid file type. Please upload an image.');
          return;
        }
        setImageFile(file); // Store the file object
        const reader = new FileReader()
        reader.onload = (event) => {
          if (event.target?.result) {
            setImage(event.target.result as string) // Set preview
          }
        }
        reader.onerror = () => {
          console.error("Error reading file")
          setError("Failed to read file.")
        }
        reader.readAsDataURL(file)
      }
    } catch (err) {
      console.error("Error uploading file:", err)
      setError("Failed to process file upload.")
    }
  }

  const handleSubmit = async () => {
    if (!imageFile || !reportId) {
      setError("Please select or capture an image.");
      return;
    }
    setError(null)
    setIsSubmitting(true)
    setIsSuccess(false)

    const formData = new FormData();
    formData.append('reportId', reportId);
    formData.append('image', imageFile);

    try {
      const response = await fetch('/api/reports/clean', { // Target new API route
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      // Success
      setIsSuccess(true);
      toast({
        title: "Report Marked as Cleaned!",
        description: "Thank you for cleaning up! Points may be awarded after review.",
      });

      // Delay closing the modal to show success state
      setTimeout(() => {
          handleClose(); // Use handleClose to reset state properly
      }, 1500);

    } catch (err) {
      console.error("Error submitting clean report:", err);
      setError(err instanceof Error ? err.message : "Failed to submit. Please try again.");
      setIsSubmitting(false); // Ensure submitting is false on error
      setIsSuccess(false);
    }
  }

  const handleClose = () => {
    // Reset state on close
    setImage(null)
    setImageFile(null)
    setIsCapturing(false)
    setIsSubmitting(false)
    setIsSuccess(false)
    setError(null)
    onClose() // Call the parent's onClose handler
  }

  // Reset state if the modal is reopened with a new reportId or closed externally
  useEffect(() => {
    if (!isOpen) {
       // Small delay to allow closing animation before resetting state
      const timer = setTimeout(() => {
        setImage(null)
        setImageFile(null)
        setIsCapturing(false)
        setIsSubmitting(false)
        setIsSuccess(false)
        setError(null)
      }, 300); // Adjust timing if needed
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-w-[95vw] p-4 sm:p-6 max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mark Report as Cleaned</DialogTitle>
          <DialogDescription>
            Upload a photo showing the area has been cleaned up. Thank you!
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Error Display */}
          {error && (
            <div className="p-3 text-sm bg-red-100 text-red-700 border border-red-200 rounded-md flex items-start">
              <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Image Capture/Preview/Upload Section */}
          <div className="grid gap-2">
            {isCapturing ? (
              <div className="relative bg-black rounded-md overflow-hidden h-48 sm:h-64">
                {/* Webcam Component */}
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }}
                  className="w-full h-full object-cover"
                  style={{ backgroundColor: 'black' }}
                />
                <Button
                  onClick={captureImage}
                  className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-6 py-2 text-base z-10"
                  variant="secondary"
                  disabled={isSubmitting}
                >
                  <Camera className="mr-2 h-4 w-4" /> Capture Cleaned Area
                </Button>
              </div>
            ) : image ? (
              <div className="relative w-full h-48 sm:h-64">
                {/* Image Preview */}
                <Image
                  src={image}
                  alt="Cleaned area preview"
                  fill
                  style={{ objectFit: "cover" }}
                  className="rounded-md"
                  sizes="(max-width: 640px) 100vw, 500px"
                />
                <Button
                  onClick={() => { setImage(null); setImageFile(null); setError(null); }}
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
                {/* Action Buttons */}
                <Button onClick={startCamera} variant="outline" disabled={isSubmitting}>
                  <Camera className="mr-2 h-4 w-4" /> Take Photo
                </Button>
                <div className="relative">
                  <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full" disabled={isSubmitting}>
                    <Upload className="mr-2 h-4 w-4" /> Upload Photo
                  </Button>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*" // Accept any image type for clean proof
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="touch-target"
            disabled={isSubmitting || isSuccess}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!imageFile || isSubmitting || isSuccess}
            className={`touch-target ${isSuccess ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} disabled:bg-gray-400 disabled:opacity-70 disabled:cursor-not-allowed`}
          >
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting Proof...</>
            ) : isSuccess ? (
              <><Check className="mr-2 h-4 w-4" /> Submitted!</>
            ) : (
              'Submit Clean Proof'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 