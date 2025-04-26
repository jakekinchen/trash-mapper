"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Camera, Upload, X } from "lucide-react"

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  userLocation: [number, number] | null
}

export default function ReportModal({ isOpen, onClose, onSubmit, userLocation }: ReportModalProps) {
  const [image, setImage] = useState<string | null>(null)
  const [description, setDescription] = useState("")
  const [severity, setSeverity] = useState([5]) // 1-10 scale
  const [isCapturing, setIsCapturing] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsCapturing(true)
      }
    } catch (err) {
      console.error("Error accessing camera:", err)
      alert("Could not access camera. Please check permissions or try uploading an image instead.")
    }
  }

  const captureImage = () => {
    try {
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current
        const canvas = canvasRef.current
        const context = canvas.getContext("2d")

        if (context) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          context.drawImage(video, 0, 0, canvas.width, canvas.height)

          const imageDataUrl = canvas.toDataURL("image/jpeg")
          setImage(imageDataUrl)

          // Stop the camera stream
          const stream = video.srcObject as MediaStream
          if (stream) {
            stream.getTracks().forEach((track) => track.stop())
          }

          setIsCapturing(false)
        }
      }
    } catch (error) {
      console.error("Error capturing image:", error)
      setIsCapturing(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (event) => {
          if (event.target?.result) {
            setImage(event.target.result as string)
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
    try {
      // Allow submission even without precise location
      onSubmit({
        location: userLocation || [-97.7431, 30.2672], // Use default Austin coordinates if no location
        description,
        severity: severity && severity.length > 0 ? severity[0] : 5,
        imageUrl: image,
        timestamp: new Date().toISOString(),
      })

      // Reset form
      setImage(null)
      setDescription("")
      setSeverity([5])
      setIsCapturing(false)
    } catch (error) {
      console.error("Error submitting form:", error)
    }
  }

  const handleClose = () => {
    try {
      // Stop camera if it's running
      if (isCapturing && videoRef.current) {
        const stream = videoRef.current.srcObject as MediaStream
        if (stream) {
          stream.getTracks().forEach((track) => track.stop())
        }
      }

      // Reset state
      setIsCapturing(false)

      // Call the provided onClose function
      onClose()
    } catch (error) {
      console.error("Error closing modal:", error)
      // Still try to close the modal
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-w-[95vw] p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Report Pollution</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {isCapturing ? (
            <div className="relative">
              <video ref={videoRef} autoPlay playsInline className="w-full h-64 object-cover rounded-md" />
              <Button
                onClick={captureImage}
                className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-6 py-2 text-base"
                variant="secondary"
              >
                <Camera className="mr-2 h-4 w-4" />
                Capture
              </Button>
            </div>
          ) : image ? (
            <div className="relative">
              <img
                src={image || "/placeholder.svg"}
                alt="Captured pollution"
                className="w-full h-64 object-cover rounded-md"
              />
              <Button
                onClick={() => setImage(null)}
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="grid gap-2">
              <Button onClick={startCamera} variant="outline">
                <Camera className="mr-2 h-4 w-4" />
                Take Photo
              </Button>
              <div className="relative">
                <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Image
                </Button>
                <Input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </div>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the pollution you're reporting..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>Severity (1-10)</Label>
            <Slider value={severity} min={1} max={10} step={1} onValueChange={setSeverity} />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Minor</span>
              <span>Severe</span>
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
          <Button variant="outline" onClick={handleClose} className="touch-target">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!description} className="touch-target">
            Submit Report
          </Button>
        </DialogFooter>

        {/* Hidden canvas for image capture */}
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  )
}
