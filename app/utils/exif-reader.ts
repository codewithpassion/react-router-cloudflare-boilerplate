import EXIF from "exif-js";

export interface ExifData {
	dateTaken?: Date;
	camera?: string;
	lens?: string;
	settings?: {
		iso?: number;
		aperture?: string;
		shutterSpeed?: string;
		focalLength?: string;
	};
	location?: {
		latitude?: number;
		longitude?: number;
		address?: string;
	};
}

export function extractExifData(file: File): Promise<ExifData> {
	return new Promise((resolve) => {
		EXIF.getData(file as any, function () {
			const exifData: ExifData = {};

			try {
				// Extract date taken
				const dateTime = EXIF.getTag(this, "DateTime");
				const dateTimeOriginal = EXIF.getTag(this, "DateTimeOriginal");
				if (dateTimeOriginal || dateTime) {
					const dateString = dateTimeOriginal || dateTime;
					// EXIF date format: "YYYY:MM:DD HH:MM:SS"
					const formattedDate = dateString.replace(/:/g, "-").replace(" ", "T");
					try {
						exifData.dateTaken = new Date(formattedDate);
					} catch {
						// If date parsing fails, ignore
					}
				}

				// Extract camera info
				const make = EXIF.getTag(this, "Make");
				const model = EXIF.getTag(this, "Model");
				if (make && model) {
					exifData.camera = `${make} ${model}`.trim();
				} else if (model) {
					exifData.camera = model;
				}

				// Extract lens info
				const lensModel = EXIF.getTag(this, "LensModel");
				if (lensModel) {
					exifData.lens = lensModel;
				}

				// Extract camera settings
				exifData.settings = {};

				const iso = EXIF.getTag(this, "ISOSpeedRatings");
				if (iso) {
					exifData.settings.iso = iso;
				}

				const fNumber = EXIF.getTag(this, "FNumber");
				if (fNumber) {
					exifData.settings.aperture = `f/${fNumber}`;
				}

				const exposureTime = EXIF.getTag(this, "ExposureTime");
				if (exposureTime) {
					if (exposureTime < 1) {
						exifData.settings.shutterSpeed = `1/${Math.round(1 / exposureTime)}`;
					} else {
						exifData.settings.shutterSpeed = `${exposureTime}s`;
					}
				}

				const focalLength = EXIF.getTag(this, "FocalLength");
				if (focalLength) {
					exifData.settings.focalLength = `${focalLength}mm`;
				}

				// Extract GPS location
				const gpsLatitude = EXIF.getTag(this, "GPSLatitude");
				const gpsLatitudeRef = EXIF.getTag(this, "GPSLatitudeRef");
				const gpsLongitude = EXIF.getTag(this, "GPSLongitude");
				const gpsLongitudeRef = EXIF.getTag(this, "GPSLongitudeRef");

				if (gpsLatitude && gpsLongitude) {
					exifData.location = {};

					// Convert GPS coordinates to decimal degrees
					const lat = convertDMSToDD(gpsLatitude, gpsLatitudeRef);
					const lon = convertDMSToDD(gpsLongitude, gpsLongitudeRef);

					if (lat !== null && lon !== null) {
						exifData.location.latitude = lat;
						exifData.location.longitude = lon;
					}
				}
			} catch (error) {
				console.warn("Error extracting EXIF data:", error);
			}

			resolve(exifData);
		});
	});
}

// Convert GPS coordinates from DMS (Degrees, Minutes, Seconds) to DD (Decimal Degrees)
function convertDMSToDD(dms: number[], ref: string): number | null {
	if (!dms || dms.length !== 3) return null;

	let dd = dms[0] + dms[1] / 60 + dms[2] / 3600;

	if (ref === "S" || ref === "W") {
		dd = dd * -1;
	}

	return dd;
}

export function formatCameraInfo(exif: ExifData): string {
	const parts: string[] = [];

	if (exif.camera) {
		parts.push(exif.camera);
	}

	if (exif.lens) {
		parts.push(exif.lens);
	}

	return parts.join(" • ");
}

export function formatSettings(exif: ExifData): string {
	if (!exif.settings) return "";

	const parts: string[] = [];

	if (exif.settings.aperture) {
		parts.push(exif.settings.aperture);
	}

	if (exif.settings.shutterSpeed) {
		parts.push(exif.settings.shutterSpeed);
	}

	if (exif.settings.iso) {
		parts.push(`ISO ${exif.settings.iso}`);
	}

	if (exif.settings.focalLength) {
		parts.push(exif.settings.focalLength);
	}

	return parts.join(" • ");
}

export function formatLocation(exif: ExifData): string {
	if (!exif.location?.latitude || !exif.location?.longitude) {
		return "";
	}

	// Format coordinates to a reasonable precision
	const lat = exif.location.latitude.toFixed(6);
	const lon = exif.location.longitude.toFixed(6);

	return `${lat}, ${lon}`;
}

// Utility to reverse geocode coordinates to address (would need external API)
export async function reverseGeocode(
	latitude: number,
	longitude: number,
): Promise<string> {
	// This would typically use a service like Google Maps, OpenStreetMap, etc.
	// For now, just return the coordinates formatted nicely
	const latDirection = latitude >= 0 ? "N" : "S";
	const lonDirection = longitude >= 0 ? "E" : "W";

	return `${Math.abs(latitude).toFixed(4)}°${latDirection}, ${Math.abs(longitude).toFixed(4)}°${lonDirection}`;
}
