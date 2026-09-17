const DEV = {
  name: 'Álvaro Parra',
  handle: '@ParraDEV',
  email: 'alvaroparra233@gmail.com',
  phone: '+53 58239510',
  phoneHref: 'tel:+5358239510',
  role: 'Desarrollador y dueño de la aplicación',
};

export function ContactPage() {
  return (
    <div className="page">
      <h1>Contáctanos</h1>
      <p className="admin-sub">
        Aquí puedes encontrar la información del desarrollador de Buen Precio.
      </p>

      <section className="card">
        <h2>Desarrollador</h2>
        <div className="contact-info">
          <div className="contact-row">
            <span className="contact-label">Nombre</span>
            <strong>{DEV.name}</strong>
          </div>
          <div className="contact-row">
            <span className="contact-label">Rol</span>
            <span>{DEV.role}</span>
            <span className="contact-tag">{DEV.handle}</span>
          </div>
          <div className="contact-row">
            <span className="contact-label">Correo</span>
            <a className="contact-link" href={`mailto:${DEV.email}`}>
              {DEV.email}
            </a>
          </div>
          <div className="contact-row">
            <span className="contact-label">Teléfono</span>
            <a className="contact-link" href={DEV.phoneHref}>
              {DEV.phone}
            </a>
          </div>
        </div>
      </section>

      <p className="admin-sub">
        Ante cualquier duda, sugerencia o reporte, escríbenos por correo o teléfono.
      </p>
    </div>
  );
}