import { createTransport } from 'nodemailer';
import { env } from '../env.js';
import { SITE_URL } from '../seo.js';

export function isSmtpConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

export async function sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
  if (!isSmtpConfigured()) {
    throw new Error('SMTP no está configurado');
  }
  const resetUrl = `${SITE_URL}/restablecer-contrasena?token=${encodeURIComponent(token)}`;
  const transporter = createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    secure: (env.SMTP_PORT ?? 587) === 465,
    auth: { user: env.SMTP_USER!, pass: env.SMTP_PASS! },
  });
  await transporter.sendMail({
    from: env.SMTP_FROM ?? env.SMTP_USER,
    to,
    subject: 'Restablece tu contraseña - Buen Precio',
    text: [
      `Hola ${name},`,
      '',
      'Recibimos una solicitud para restablecer tu contraseña en Buen Precio.',
      'Abre este enlace para elegir una nueva (válido por 60 minutos):',
      resetUrl,
      '',
      'Si no fuiste tú, ignora este mensaje.',
    ].join('\n'),
    html: `
      <p>Hola ${name},</p>
      <p>Recibimos una solicitud para restablecer tu contraseña en <strong>Buen Precio</strong>.</p>
      <p><a href="${resetUrl}">Haz clic aquí para elegir una nueva contraseña</a> (válido por 60 minutos).</p>
      <p>Si no fuiste tú, ignora este mensaje.</p>
    `,
  });
}
