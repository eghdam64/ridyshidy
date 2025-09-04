// /var/www/ridyshidy/packages/lib/email.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export async function sendBookingConfirmationEmail({ passengerEmail, driverEmail, ride, booking }) {
  const passengerMail = {
    from: `"RidyShidy" <${process.env.SMTP_USER}>`,
    to: passengerEmail,
    subject: 'Buchungsbestätigung - RidyShidy',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #667eea;">Buchung bestätigt!</h1>
        <p>Ihre Fahrt wurde erfolgreich gebucht.</p>
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Fahrtdetails:</h3>
          <p><strong>Von:</strong> ${ride.from_location}</p>
          <p><strong>Nach:</strong> ${ride.to_location}</p>
          <p><strong>Datum:</strong> ${new Date(ride.departure_date).toLocaleDateString('de-DE')}</p>
          <p><strong>Uhrzeit:</strong> ${ride.departure_time}</p>
          <p><strong>Plätze:</strong> ${booking.seats}</p>
          <p><strong>Gesamtpreis:</strong> ${booking.totalPrice}€</p>
          <p><strong>Buchungstoken:</strong> ${booking.token}</p>
        </div>
        <p>Ihr RidyShidy Team</p>
      </div>
    `
  };

  const driverMail = {
    from: `"RidyShidy" <${process.env.SMTP_USER}>`,
    to: driverEmail,
    subject: 'Neue Buchung - RidyShidy',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #667eea;">Neue Buchung!</h1>
        <p>Ihre Fahrt wurde gebucht.</p>
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Fahrtdetails:</h3>
          <p><strong>Von:</strong> ${ride.from_location}</p>
          <p><strong>Nach:</strong> ${ride.to_location}</p>
          <p><strong>Datum:</strong> ${new Date(ride.departure_date).toLocaleDateString('de-DE')}</p>
          <p><strong>Gebuchte Plätze:</strong> ${booking.seats}</p>
          <p><strong>Verdienst:</strong> ${booking.totalPrice}€</p>
        </div>
        <p>Ihr RidyShidy Team</p>
      </div>
    `
  };

  await Promise.all([
    transporter.sendMail(passengerMail),
    transporter.sendMail(driverMail)
  ]);
}

export async function sendCancellationEmail({ passengerEmail, passengerName, ride, reason }) {
  const mailOptions = {
    from: `"RidyShidy" <${process.env.SMTP_USER}>`,
    to: passengerEmail,
    subject: 'Fahrt storniert - RidyShidy',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #e53e3e;">Fahrt storniert</h1>
        <p>Hallo ${passengerName},</p>
        <p>leider wurde die folgende Fahrt vom Fahrer storniert:</p>
        <div style="background-color: #fed7d7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Fahrtdetails:</h3>
          <p><strong>Von:</strong> ${ride.from_location}</p>
          <p><strong>Nach:</strong> ${ride.to_location}</p>
          <p><strong>Datum:</strong> ${new Date(ride.departure_date).toLocaleDateString('de-DE')}</p>
          <p><strong>Uhrzeit:</strong> ${ride.departure_time}</p>
          ${reason ? `<p><strong>Grund:</strong> ${reason}</p>` : ''}
        </div>
        <p>Der Betrag wird automatisch zurückerstattet.</p>
        <p>Ihr RidyShidy Team</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
}

