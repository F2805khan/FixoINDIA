import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import Booking from "../models/Booking.js";
import { Op } from "./sequelizeMock.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const updateAcceptedBookingsCSV = async () => {
  try {
    const acceptedStatuses = ["Professional Assigned", "On The Way", "Service In Progress", "Completed"];
    const bookings = await Booking.findAll({
      where: {
        bookingStatus: {
          [Op.in]: acceptedStatuses
        }
      },
      order: [["createdAt", "DESC"]]
    });

    const headers = [
      "Booking ID",
      "Customer Name",
      "Phone",
      "Address",
      "Service Name",
      "Salon Name",
      "Date",
      "Time",
      "Amount",
      "Payment Method",
      "Payment Status",
      "Booking Status",
      "Professional Assigned",
      "Estimated Arrival",
      "Booking Date"
    ];

    const escapeCSVValue = (val) => {
      if (val === null || val === undefined) return "";
      let str = String(val).replace(/"/g, '""');
      if (str.includes(",") || str.includes("\n") || str.includes('"')) {
        str = `"${str}"`;
      }
      return str;
    };

    const csvRows = [headers.join(",")];
    for (const b of bookings) {
      const row = [
        escapeCSVValue(b.bookingId),
        escapeCSVValue(b.customerName),
        escapeCSVValue(b.phone),
        escapeCSVValue(b.address),
        escapeCSVValue(b.serviceName),
        escapeCSVValue(b.salonName),
        escapeCSVValue(b.date),
        escapeCSVValue(b.time),
        escapeCSVValue(b.amount),
        escapeCSVValue(b.paymentMethod),
        escapeCSVValue(b.paymentStatus),
        escapeCSVValue(b.bookingStatus),
        escapeCSVValue(b.professionalName),
        escapeCSVValue(b.estimatedArrival),
        escapeCSVValue(b.createdAt)
      ];
      csvRows.push(row.join(","));
    }

    const csvContent = csvRows.join("\n");
    const dataDir = path.join(__dirname, "../data");
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(path.join(dataDir, "accepted_bookings.csv"), csvContent, "utf-8");
    console.log("Accepted bookings CSV updated successfully.");
  } catch (error) {
    console.error("Error updating accepted bookings CSV:", error);
  }
};
