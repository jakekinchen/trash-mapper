declare module 'exif-parser' {
    interface ExifParser {
        parse(): ExifData;
    }

    interface ExifData {
        tags: ExifTags;
        imageSize?: { height: number; width: number };
        thumbnailSize?: { height: number; width: number };
        hasThumbnail?: (mime: string) => boolean;
        getThumbnailBuffer?: () => Buffer;
        // Add other properties or methods if known/needed
    }

    // Define known EXIF tags - add more as needed
    interface ExifTags {
        // GPS Tags
        GPSLatitude?: number | number[]; // Can be decimal or [D, M, S]
        GPSLongitude?: number | number[]; // Can be decimal or [D, M, S]
        GPSLatitudeRef?: string; // 'N' or 'S'
        GPSLongitudeRef?: string; // 'E' or 'W'
        GPSAltitude?: number;
        GPSAltitudeRef?: number;
        GPSTimeStamp?: number[]; // [H, M, S]
        GPSSpeed?: number;
        GPSSpeedRef?: string; // 'K', 'M', 'N'
        GPSImgDirection?: number;
        GPSImgDirectionRef?: string; // 'T' or 'M'
        GPSDateStamp?: string; // YYYY:MM:DD

        // Image Tags
        Make?: string;
        Model?: string;
        Orientation?: number;
        XResolution?: number;
        YResolution?: number;
        ResolutionUnit?: number;
        Software?: string;
        ModifyDate?: string;
        Artist?: string;
        Copyright?: string;
        ExifIFDOffset?: number;
        GPSInfoIFDOffset?: number;

        // Exif Specific Tags
        ExposureTime?: number;
        FNumber?: number;
        ExposureProgram?: number;
        ISO?: number;
        ExifVersion?: Buffer | string; // Often Buffer, sometimes string
        DateTimeOriginal?: string;
        DateTimeDigitized?: string;
        ComponentConfiguration?: Buffer | string;
        CompressedBitsPerPixel?: number;
        ShutterSpeedValue?: number;
        ApertureValue?: number;
        BrightnessValue?: number;
        ExposureBiasValue?: number;
        MaxApertureValue?: number;
        SubjectDistance?: number;
        MeteringMode?: number;
        LightSource?: number;
        Flash?: number;
        FocalLength?: number;
        SubjectArea?: number[];
        MakerNote?: Buffer;
        UserComment?: Buffer | string;
        SubsecTime?: string;
        SubsecTimeOriginal?: string;
        SubsecTimeDigitized?: string;
        FlashpixVersion?: Buffer | string;
        ColorSpace?: number;
        PixelXDimension?: number;
        PixelYDimension?: number;
        RelatedSoundFile?: string;
        FlashEnergy?: number;
        SpatialFrequencyResponse?: any; // Complex structure
        FocalPlaneXResolution?: number;
        FocalPlaneYResolution?: number;
        FocalPlaneResolutionUnit?: number;
        SubjectLocation?: number[];
        ExposureIndex?: number;
        SensingMethod?: number;
        FileSource?: Buffer | number;
        SceneType?: Buffer | number;
        CFAPattern?: Buffer;
        CustomRendered?: number;
        ExposureMode?: number;
        WhiteBalance?: number;
        DigitalZoomRatio?: number;
        FocalLengthIn35mmFilm?: number;
        SceneCaptureType?: number;
        GainControl?: number;
        Contrast?: number;
        Saturation?: number;
        Sharpness?: number;
        DeviceSettingDescription?: any; // Complex structure
        SubjectDistanceRange?: number;
        ImageUniqueID?: string;
        LensSpecification?: number[];
        LensMake?: string;
        LensModel?: string;
        LensSerialNumber?: string;

        [key: string]: any; // Allow other unknown tags
    }

    function create(buffer: Buffer): ExifParser;

    // Export the main function and potentially types/interfaces if needed by consumers
    export default create;
} 