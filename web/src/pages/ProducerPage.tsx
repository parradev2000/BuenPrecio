import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { App, Button, Image, Select, Tag, Upload } from 'antd';
import { EnvironmentOutlined, UploadOutlined } from '@ant-design/icons';
import { api } from '../api/client';
import type { Business, Category } from '../api/types';
import { Alert, EmptyState, Field, Loading } from '../components/ui';
import { MapPicker } from '../components/MapPicker';
import { getCurrentPosition, reverseGeocode } from '../lib/geo';

const ACCEPTED = 'image/jpeg,image/png,image/webp,image/gif';

export function ProducerPage() {
  const navigate = useNavigate();
  const { modal } = App.useApp();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Business | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    categoryId: '',
    photoUrl: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
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

  const EMPTY_FORM = { name: '', description: '', address: '', phone: '', categoryId: '', photoUrl: '' };

  function resetForm() {
    setForm(EMPTY_FORM);
    setCoords({});
    setShowMap(false);
    setShowNewCat(false);
    setNewCatName('');
    setEditing(null);
  }

  function toggleForm() {
    resetForm();
    setFormError(null);
    setShowForm((v) => !v);
  }

  function startEdit(business: Business) {
    setEditing(business);
    setForm({
      name: business.name,
      description: business.description ?? '',
      address: business.address ?? '',
      phone: business.phone ?? '',
      categoryId: business.categoryId ?? '',
      photoUrl: business.photoUrl ?? '',
    });
    setCoords({
      latitude: business.latitude ?? undefined,
      longitude: business.longitude ?? undefined,
    });
    setShowMap(false);
    setShowNewCat(false);
    setFormError(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveBusiness(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      const body: Record<string, string | number> = { name: form.name };
      if (form.description || editing) body.description = form.description;
      if (form.address || editing) body.address = form.address;
      if (form.phone || editing) body.phone = form.phone;
      if (form.categoryId) body.categoryId = form.categoryId;
      if (form.photoUrl.trim()) body.photoUrl = form.photoUrl.trim();
      if (coords.latitude !== undefined) body.latitude = coords.latitude;
      if (coords.longitude !== undefined) body.longitude = coords.longitude;
      if (editing) {
        await api(`/businesses/${editing.id}`, { method: 'PATCH', body, auth: true });
        setShowForm(false);
        resetForm();
        await load();
      } else {
        const res = await api<{ business: Business }>('/businesses', { method: 'POST', body, auth: true });
        setShowForm(false);
        resetForm();
        navigate(`/mis-negocios/${res.business.id}`);
      }
    } catch (e) {
      setFormError(e instanceof Error ? e.message : editing ? 'No se pudo guardar el negocio' : 'No se pudo crear el negocio');
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

  async function uploadPhoto(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setFormError('El archivo es demasiado grande (máximo 5 MB)');
      return;
    }
    const body = new FormData();
    body.append('file', file);
    setPhotoUploading(true);
    setFormError(null);
    try {
      const res = await api<{ url: string }>('/uploads', { method: 'POST', body, auth: true });
      set('photoUrl', res.url);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'No se pudo subir la foto');
    } finally {
      setPhotoUploading(false);
    }
  }

  async function doToggle(business: Business) {
    setFormError(null);
    try {
      await api(`/businesses/${business.id}`, {
        method: business.active ? 'DELETE' : 'PATCH',
        body: business.active ? undefined : { active: true },
        auth: true,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar el negocio');
    }
  }

  function toggleActive(business: Business) {
    if (!business.active) {
      void doToggle(business);
      return;
    }
    modal.confirm({
      title: 'Desactivar negocio',
      content: `¿Desactivar "${business.name}"? Dejará de verse en el catálogo.`,
      okText: 'Desactivar',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: () => doToggle(business),
    });
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Mis negocios</h1>
        <Button type={showForm ? 'default' : 'primary'} onClick={toggleForm}>
          {showForm ? 'Cancelar' : 'Nuevo negocio'}
        </Button>
      </div>

      {error && (
        <div className="mt-4">
          <Alert kind="error">{error}</Alert>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={saveBusiness}
          className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <h2 className="text-lg font-semibold text-slate-900">
            {editing ? 'Editar negocio' : 'Nuevo negocio'}
          </h2>
          <div className="mt-4">
            {formError && <Alert kind="error">{formError}</Alert>}
            <Field
              label="Nombre *"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              maxLength={200}
              placeholder="Ej. Cafetería La Esquina"
            />
            <Field
              label="Descripción"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              maxLength={500}
            />

            <div className="mb-3">
              <span className="mb-1 block text-sm font-medium text-slate-600">Foto del negocio</span>
              <div className="flex flex-wrap items-center gap-3">
                <Upload
                  accept={ACCEPTED}
                  showUploadList={false}
                  beforeUpload={(file) => {
                    void uploadPhoto(file);
                    return false;
                  }}
                >
                  <Button icon={<UploadOutlined />} loading={photoUploading}>
                    {photoUploading ? 'Subiendo…' : 'Subir foto'}
                  </Button>
                </Upload>
                {!photoUploading && form.photoUrl && (
                  <Image
                    src={form.photoUrl}
                    alt=""
                    className="h-14 w-14 rounded-lg border border-slate-200 object-cover"
                  />
                )}
              </div>
            </div>

            <Field
              label="Dirección"
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              maxLength={300}
            />
            <div className="mb-2 flex flex-wrap gap-2">
              <Button size="small" onClick={() => setShowMap((v) => !v)}>
                {showMap ? 'Ocultar mapa' : 'Elegir en el mapa'}
              </Button>
              <Button size="small" onClick={() => void gps()}>
                Usar mi ubicación
              </Button>
            </div>
            {(coords.latitude !== undefined || coords.longitude !== undefined) && (
              <p className="mb-3 text-sm text-slate-500">
                Ubicación fijada ({coords.latitude?.toFixed(4)}, {coords.longitude?.toFixed(4)})
              </p>
            )}
            {showMap && (
              <div className="mb-3">
                <MapPicker
                  onPick={(pick) => {
                    set('address', pick.address);
                    setCoords({ latitude: pick.latitude, longitude: pick.longitude });
                    setShowMap(false);
                  }}
                />
              </div>
            )}

            <Field
              label="Teléfono"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              maxLength={30}
            />

            <div className="mb-3">
              <span className="mb-1 block text-sm font-medium text-slate-600">Tipo de negocio</span>
              <div className="flex gap-2">
                <Select
                  allowClear
                  className="flex-1"
                  value={form.categoryId || undefined}
                  onChange={(v) => set('categoryId', v ?? '')}
                  placeholder="Sin tipo de negocio"
                  options={categories.map((c) => ({ value: c.id, label: c.name }))}
                />
                <Button onClick={() => setShowNewCat((v) => !v)}>
                  {showNewCat ? 'Cancelar' : '+ Nueva'}
                </Button>
              </div>
            </div>
            {showNewCat && (
              <div className="mb-3 flex items-end gap-2">
                <div className="flex-1">
                  <Field
                    label="Nuevo tipo de negocio"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Ej. Panadería"
                  />
                </div>
                <Button
                  type="primary"
                  className="mb-3"
                  loading={catBusy}
                  disabled={!newCatName.trim()}
                  onClick={() => void createCategory()}
                >
                  Crear
                </Button>
              </div>
            )}
            {catError && <Alert kind="error">{catError}</Alert>}

            <Button type="primary" htmlType="submit" loading={busy} disabled={!form.name.trim()}>
              {editing ? 'Guardar cambios' : 'Crear negocio'}
            </Button>
          </div>
        </form>
      )}

      <div className="mt-6">
        {loading && <Loading />}
        {!loading && businesses.length === 0 && (
          <EmptyState
            message="Aún no tienes negocios. ¡Crea el primero!"
            action={
              <Button
                type="primary"
                size="small"
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
              >
                Crear negocio
              </Button>
            }
          />
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((b) => (
            <div
              key={b.id}
              className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div>
                <Tag color={b.active ? 'green' : 'default'}>{b.active ? 'Activo' : 'Desactivado'}</Tag>
              </div>
              <h2 className="text-base font-semibold text-slate-900">{b.name}</h2>
              {b.address && (
                <p className="inline-flex items-center gap-1 text-sm text-slate-500">
                  <EnvironmentOutlined /> {b.address}
                </p>
              )}
              <p className="text-sm text-slate-500">
                {b.itemsCount ?? 0} producto{b.itemsCount === 1 ? '' : 's'}
              </p>
              <div className="mt-auto flex flex-wrap gap-2 pt-2">
                <Link to={`/mis-negocios/${b.id}`}>
                  <Button size="small" type="primary">
                    Gestionar
                  </Button>
                </Link>
                <Button size="small" onClick={() => startEdit(b)}>
                  Editar
                </Button>
                <Button size="small" type="text" onClick={() => toggleActive(b)}>
                  {b.active ? 'Desactivar' : 'Activar'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
