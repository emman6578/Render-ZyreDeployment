import nodemailer from "nodemailer";

export async function sendEmail(data: any) {
  try {
    let transporter = nodemailer.createTransport({
      pool: true,
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.MAIL_ID,
        pass: process.env.MP,
      },
      maxConnections: 5,
      maxMessages: 100,
    });

    await transporter.sendMail({
      from: {
        name: "This is from system code",
        address: "This is the code you requested to log in into system",
      },
      to: data.to,
      subject: data.subject,
      text: data.text,
      html: data.htm,
    });
  } catch (error) {
    throw new Error("Failed to send email" + error);
  }
}
