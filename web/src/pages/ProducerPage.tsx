import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { Business, Category } from '../api/types';
import { Alert, EmptyState, Field, Loading } from '../components/ui';
import { MapPicker } from '../components/MapPicker';
import { getCurrentPosition, reverseGeocode } from '../lib/geo';

export function ProducerPage() {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', address: '', phone: '', categoryId: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [catBusy, setCatBusy] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ latitude?: number; longitude?: number }>({});
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [my, cats] = await Promise.all([
        api<{ items: Business[] }>('/my/businesses', { auth: true }),
        api<{ items: Category[] }>('/categories'),
      ]);
      setBusinesses(my.items);
      setCategories(cats.items.filter((c) => c.kind === 'negocio'));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar');
    } finally {
      setLoading(false);
    }
  }

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function createBusiness(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      const body: Record<string, string | number> = { name: form.name };
      if (form.description) body.description = form.description;
      if (form.address) body.address = form.address;
      if (form.phone) body.phone = form.phone;
      if (form.categoryId) body.categoryId = form.categoryId;
      if (coords.latitude !== undefined) body.latitude = coords.latitude;
      if (coords.longitude !== undefined) body.longitude = coords.longitude;
      const res = await api<{ business: Business }>('/businesses', { method: 'POST', body, auth: true });
      setShowForm(false);
      setForm({ name: '', description: '', address: '', phone: '', categoryId: '' });
      setCoords({});
      setShowMap(false);
      navigate(`/mis-negocios/${res.business.id}`);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'No se pudo crear el negocio');
    } finally {
      setBusy(false);
    }
  }

  async function createCategory() {
    setCatBusy(true);
    setCatError(null);
    try {
      const res = await api<{ category: Category }>('/categories', {
        method: 'POST',
        auth: true,
        body: { name: newCatName.trim(), kind: 'negocio' },
      });
      setCategories((prev) => [...prev, res.category].sort((a, b) => a.name.localeCompare(b.name)));
      set('categoryId', res.category.id);
      setShowNewCat(false);
      setNewCatName('');
    } catch (e) {
      setCatError(e instanceof Error ? e.message : 'No se pudo crear');
    } finally {
      setCatBusy(false);
    }
  }

  async function gps() {
    setFormError(null);
    try {
      const pos = await getCurrentPosition();
      const address = await reverseGeocode(pos.latitude, pos.longitude);
      set('address', address ?? form.address);
      setCoords(pos);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'No se pudo obtener la ubicación');
    }
  }

  async function toggleActive(business: Business) {
    await api(`/businesses/${business.id}`, {
      method: business.active ? 'DELETE' : 'PATCH',
      body: business.active ? undefined : { active: true },
      auth: true,
    });
    await load();
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Mis negocios</h1>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancelar' : 'Nuevo negocio'}
        </button>
      </div>

      {error && <Alert kind="error">{error}</Alert>}

      {showForm && (
        <form onSubmit={createBusiness} className="form card">
          <h2>Nuevo negocio</h2>
          {formError && <Alert kind="error">{formError}</Alert>}
          <Field label="Nombre *" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej. Cafetería La Esquina" />
          <Field label="Descripción" value={form.description} onChange={(e) => set('description', e.target.value)} />
          <Field label="Dirección" value={form.address} onChange={(e) => set('address', e.target.value)} />
          <div className="map-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowMap((v) => !v)}>
              {showMap ? 'Ocultar mapa' : 'Elegir en el mapa'}
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void gps()}>
              Usar mi ubicación
            </button>
          </div>
          {(coords.latitude !== undefined || coords.longitude !== undefined) && (
            <p className="muted">
              Ubicación fijada ({coords.latitude?.toFixed(4)}, {coords.longitude?.toFixed(4)})
            </p>
          )}
          {showMap && <MapPicker onPick={(pick) => { set('address', pick.address); setCoords({ latitude: pick.latitude, longitude: pick.longitude }); setShowMap(false); }} />}
          <Field label="Teléfono" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          <label className="field">
            <span className="field-label">Tipo de negocio</span>
            <div className="inline-field">
              <select className="field-input" value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
                <option value="">Sin tipo de negocio</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowNewCat((v) => !v)}>
                {showNewCat ? 'Cancelar' : '+ Nueva'}
              </button>
            </div>
          </label>
          {showNewCat && (
            <div className="inline-field">
              <Field
                label="Nuevo tipo de negocio"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Ej. Panadería"
              />
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={catBusy || !newCatName.trim()}
                onClick={() => void createCategory()}
              >
                {catBusy ? '…' : 'Crear'}
              </button>
            </div>
          )}
          {catError && <Alert kind="error">{catError}</Alert>}
          <button type="submit" className="btn btn-primary" disabled={busy || !form.name.trim()}>
            {busy ? 'Creando…' : 'Crear negocio'}
          </button>
        </form>
      )}

      {loading && <Loading />}
      {!loading && businesses.length === 0 && <EmptyState message="Aún no tienes negocios. ¡Crea el primero!" />}
      <div className="grid">
        {businesses.map((b) => (
          <div key={b.id} className="grid-item">
            <span className={`chip ${b.active ? '' : 'chip-off'}`}>{b.active ? 'Activo' : 'Desactivado'}</span>
            <h2>{b.name}</h2>
            {b.address && <p className="muted">{b.address}</p>}
            <p className="muted">{b.itemsCount ?? 0} producto{b.itemsCount === 1 ? '' : 's'}</p>
            <div className="row-actions">
              <Link to={`/mis-negocios/${b.id}`} className="btn btn-secondary btn-sm">
                Gestionar
              </Link>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => void toggleActive(b)}>
                {b.active ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}