// ============================================
// PRODUCTO FORM - Crear / Editar — Maria Bonita
// Fixes: imagen upload, campos pre-poblados, cajero puede editar
// ============================================

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Save, Package, Tag, Image as ImageIcon,
  Plus, X, Barcode, Loader2, Upload, Trash2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '@/services/api';
import { useThemeStore } from '@/store/theme.store';
import { generateSKU } from '@/utils/format';
import { clsx } from 'clsx';


export default function ProductFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { isDark } = useThemeStore();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [variants, setVariants] = useState([]);
  const [images, setImages] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [productLoaded, setProductLoaded] = useState(false);
  const [attr1, setAttr1] = useState({ name: 'Talle', text: '' });
  const [attr2, setAttr2] = useState({ name: 'Color', text: '', enabled: true });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
    defaultValues: {
      status: 'ACTIVO',
      minStock: 5,
      taxRate: 0,
      isFeatured: false,
    }
  });

  const productName = watch('name');

  // Auto-generate SKU solo en creación
  useEffect(() => {
    if (!isEdit && productName) {
      setValue('sku', generateSKU(productName));
    }
  }, [productName, isEdit]);

  // Cargar producto existente para edición
  const { isLoading: loadingProduct, data: productData } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.get(`/products/${id}`).then(r => r.data.data),
    enabled: isEdit,
  });

  // Pre-poblar formulario cuando llegan los datos
  useEffect(() => {
    if (productData && isEdit && !productLoaded) {
      // Resetear el formulario con todos los datos del producto
      reset({
        name: productData.name || '',
        description: productData.description || '',
        sku: productData.sku || '',
        barcode: productData.barcode || '',
        categoryId: productData.categoryId || '',
        brandId: productData.brandId || '',
        costPrice: productData.costPrice ?? '',
        salePrice: productData.salePrice ?? '',
        minStock: productData.minStock ?? 5,
        taxRate: productData.taxRate ?? 0,
        status: productData.status || 'ACTIVO',
        isFeatured: productData.isFeatured || false,
        tags: Array.isArray(productData.tags) ? productData.tags.join(', ') : (productData.tags || ''),
      });
      setImages(productData.images || []);
      setVariants(productData.variants || []);
      setProductLoaded(true);
    }
  }, [productData, isEdit, productLoaded, reset]);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data.data)
  });

  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: () => api.get('/brands').then(r => r.data.data)
  });

  // ── Upload de imágenes ──────────────────────────────────────────────────
  const handleImageUpload = async (files) => {
    if (!files || files.length === 0) return;
    setUploadingImage(true);
    try {
      for (const file of Array.from(files)) {
        // Convertir a base64 para preview inmediato y enviar al backend
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64 = e.target.result;
          // Subir al servidor
          try {
            const formData = new FormData();
            formData.append('image', file);
            const res = await api.post('/upload/image', formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data?.data?.url) {
              setImages(prev => [...prev, res.data.data.url]);
            } else {
              // Fallback: usar base64 si el upload falla
              setImages(prev => [...prev, base64]);
            }
          } catch {
            // Si el servidor no está disponible, usar base64 como fallback
            setImages(prev => [...prev, base64]);
          }
          setUploadingImage(false);
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      toast.error('Error al subir imagen');
      setUploadingImage(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleImageUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e) => e.preventDefault();

  // ── Mutación guardar ────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (data) => isEdit
      ? api.put(`/products/${id}`, data)
      : api.post('/products', data),
    onSuccess: () => {
      toast.success(isEdit ? 'Producto actualizado correctamente' : 'Producto creado correctamente');
      queryClient.invalidateQueries(['products']);
      queryClient.invalidateQueries(['product', id]);
      navigate('/products');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error al guardar el producto')
  });

  const onSubmit = (data) => {
    saveMutation.mutate({
      ...data,
      images,
      variants,
      costPrice: Number(data.costPrice),
      salePrice: Number(data.salePrice),
      minStock: Number(data.minStock),
      taxRate: Number(data.taxRate),
      tags: data.tags ? (typeof data.tags === 'string' ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : data.tags) : [],
    });
  };

  // Generar variantes desde texto libre
  const generateVariants = () => {
    const v1 = attr1.text.split(',').map(s => s.trim()).filter(Boolean);
    const v2 = attr2.enabled ? attr2.text.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (v1.length === 0) { toast.error(`Escribí al menos un valor para "${attr1.name}"`); return; }
    const a2vals = v2.length > 0 ? v2 : [null];
    const newVariants = [];
    v1.forEach(val1 => {
      a2vals.forEach(val2 => {
        const size  = attr1.name.toLowerCase().includes('talle') || attr1.name.toLowerCase().includes('tama') ? val1
                    : attr2.name.toLowerCase().includes('talle') || attr2.name.toLowerCase().includes('tama') ? val2
                    : val1;
        const color = attr1.name.toLowerCase().includes('color') ? val1
                    : attr2.name.toLowerCase().includes('color') ? val2
                    : val2;
        const label = [val1, val2].filter(Boolean).join('-');
        const existing = variants.find(v => v.sku === `${watch('sku') || 'SKU'}-${label.replace(/ /g,'').toUpperCase().slice(0,10)}`);
        if (!existing) {
          newVariants.push({
            size, color,
            sku: `${watch('sku') || 'SKU'}-${label.replace(/ /g,'').toUpperCase().slice(0,10)}`,
            price: null, isActive: true
          });
        }
      });
    });
    if (newVariants.length === 0) { toast.error('Esas variantes ya existen'); return; }
    setVariants(prev => [...prev, ...newVariants]);
    toast.success(`${newVariants.length} variante(s) generadas`);
  };

  const inputClass = clsx(
    'w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all',
    isDark
      ? 'bg-dark-800 border-dark-700 text-white placeholder:text-dark-600 focus:border-primary-500'
      : 'bg-white border-gray-200 text-dark-900 placeholder:text-gray-400 focus:border-primary-500'
  );
  const labelClass = clsx('block text-xs font-semibold mb-1', isDark ? 'text-dark-300' : 'text-dark-700');
  const cardClass = clsx('rounded-2xl border p-5 space-y-4', isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100');

  if (isEdit && loadingProduct) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/products')}
          className={clsx('p-2 rounded-xl transition-colors', isDark ? 'hover:bg-dark-800 text-dark-400' : 'hover:bg-gray-100 text-gray-400')}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className={clsx('text-2xl font-display font-bold', isDark ? 'text-white' : 'text-dark-900')}>
            {isEdit ? 'Editar Producto' : 'Nuevo Producto'}
          </h1>
          <p className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-gray-500')}>
            {isEdit ? `Editando: ${productData?.name || ''}` : 'Completa la información del producto'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">

          {/* Basic Info */}
          <div className={cardClass}>
            <h3 className={clsx('font-semibold flex items-center gap-2', isDark ? 'text-white' : 'text-dark-900')}>
              <Package className="w-4 h-4 text-primary-500" />
              Información Básica
            </h3>

            <div>
              <label className={labelClass}>Nombre del Producto *</label>
              <input
                {...register('name', { required: 'El nombre es requerido' })}
                placeholder="Ej: Blusa Floral Manga Larga"
                className={clsx(inputClass, errors.name && 'border-red-500')}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className={labelClass}>Descripción</label>
              <textarea
                {...register('description')}
                placeholder="Descripción del producto..."
                rows={3}
                className={clsx(inputClass, 'resize-none')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Categoría</label>
                <select {...register('categoryId')} className={inputClass}>
                  <option value="">Sin categoría</option>
                  {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Marca</label>
                <select {...register('brandId')} className={inputClass}>
                  <option value="">Sin marca</option>
                  {brands?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>SKU *</label>
                <div className="relative">
                  <input
                    {...register('sku', { required: 'SKU requerido' })}
                    className={clsx(inputClass, 'pr-20', errors.sku && 'border-red-500')}
                    placeholder="AUTO-GENERADO"
                  />
                  <button
                    type="button"
                    onClick={() => setValue('sku', generateSKU(productName || 'PROD'))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-primary-500 hover:text-primary-600 font-medium"
                  >
                    Generar
                  </button>
                </div>
              </div>
              <div>
                <label className={labelClass}>Código de Barras</label>
                <div className="relative">
                  <Barcode className={clsx('absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4', isDark ? 'text-dark-500' : 'text-gray-400')} />
                  <input {...register('barcode')} className={clsx(inputClass, 'pl-10')} placeholder="EAN / UPC" />
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass}>Tags (separados por coma)</label>
              <input
                {...register('tags')}
                placeholder="verano, oferta, nueva colección"
                className={inputClass}
              />
            </div>
          </div>

          {/* Pricing */}
          <div className={cardClass}>
            <h3 className={clsx('font-semibold flex items-center gap-2', isDark ? 'text-white' : 'text-dark-900')}>
              <Tag className="w-4 h-4 text-emerald-500" />
              Precios e Impuestos
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Costo (₲) *</label>
                <input
                  type="number"
                  {...register('costPrice', { required: true, min: 0 })}
                  placeholder="0"
                  className={clsx(inputClass, errors.costPrice && 'border-red-500')}
                />
              </div>
              <div>
                <label className={labelClass}>Precio Venta (₲) *</label>
                <input
                  type="number"
                  {...register('salePrice', { required: true, min: 0 })}
                  placeholder="0"
                  className={clsx(inputClass, errors.salePrice && 'border-red-500')}
                />
              </div>
              <div>
                <label className={labelClass}>Impuesto (%)</label>
                <input type="number" {...register('taxRate')} placeholder="0" step="0.01" className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Stock Mínimo (alerta)</label>
                <input type="number" {...register('minStock')} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Estado</label>
                <select {...register('status')} className={inputClass}>
                  <option value="ACTIVO">Activo</option>
                  <option value="INACTIVO">Inactivo</option>
                </select>
              </div>
            </div>
          </div>

          {/* Variants */}
          <div className={cardClass}>
            <div className="flex items-center justify-between">
              <h3 className={clsx('font-semibold', isDark ? 'text-white' : 'text-dark-900')}>
                Variantes del Producto
              </h3>
              <span className={clsx('text-xs', isDark ? 'text-dark-500' : 'text-gray-400')}>opcional</span>
            </div>

            <p className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-gray-500')}>
              Escribí los valores separados por coma. Ej: <span className="font-mono">38, 39, 40, 41</span>
            </p>

            {/* Atributo 1 */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className={labelClass}>Nombre atributo</label>
                <input
                  value={attr1.name}
                  onChange={e => setAttr1(a => ({ ...a, name: e.target.value }))}
                  placeholder="Talle, Tamaño..."
                  className={inputClass}
                />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Valores (separados por coma)</label>
                <input
                  value={attr1.text}
                  onChange={e => setAttr1(a => ({ ...a, text: e.target.value }))}
                  placeholder="38, 39, 40, 41, 42"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Atributo 2 toggle + campos */}
            <div>
              <button type="button"
                onClick={() => setAttr2(a => ({ ...a, enabled: !a.enabled }))}
                className={clsx('text-xs font-medium transition-colors', attr2.enabled ? 'text-red-400 hover:text-red-500' : 'text-primary-500 hover:text-primary-600')}
              >
                {attr2.enabled ? '− Quitar segundo atributo' : '+ Agregar segundo atributo (ej: Color)'}
              </button>

              {attr2.enabled && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div>
                    <label className={labelClass}>Nombre atributo</label>
                    <input
                      value={attr2.name}
                      onChange={e => setAttr2(a => ({ ...a, name: e.target.value }))}
                      placeholder="Color, Aroma..."
                      className={inputClass}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass}>Valores (separados por coma)</label>
                    <input
                      value={attr2.text}
                      onChange={e => setAttr2(a => ({ ...a, text: e.target.value }))}
                      placeholder="Negro, Blanco, Rojo"
                      className={inputClass}
                    />
                  </div>
                </div>
              )}
            </div>

            <button type="button" onClick={generateVariants}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500/10 text-primary-500 hover:bg-primary-500/20 rounded-xl text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" />
              Generar Variantes
            </button>

            {variants.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className={clsx('text-xs font-semibold', isDark ? 'text-dark-400' : 'text-gray-500')}>
                    {variants.length} variante(s)
                  </p>
                  <button type="button" onClick={() => setVariants([])} className="text-xs text-red-400 hover:text-red-500">Limpiar</button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {variants.map((v, i) => (
                    <div key={i} className={clsx('flex items-center gap-3 px-3 py-2 rounded-xl border', isDark ? 'border-dark-700 bg-dark-800/50' : 'border-gray-100 bg-gray-50')}>
                      <span className={clsx('flex-1 text-sm', isDark ? 'text-dark-300' : 'text-dark-700')}>
                        {[v.size, v.color].filter(Boolean).join(' / ')}
                      </span>
                      <span className={clsx('text-xs font-mono', isDark ? 'text-dark-400' : 'text-gray-500')}>{v.sku}</span>
                      <button type="button" onClick={() => setVariants(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">

          {/* Images — con upload funcional */}
          <div className={cardClass}>
            <h3 className={clsx('font-semibold flex items-center gap-2', isDark ? 'text-white' : 'text-dark-900')}>
              <ImageIcon className="w-4 h-4 text-violet-500" />
              Imágenes del Producto
            </h3>

            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className={clsx(
                'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors select-none',
                isDark ? 'border-dark-700 hover:border-primary-500 hover:bg-dark-800/40' : 'border-gray-200 hover:border-primary-400 hover:bg-primary-50/30'
              )}
            >
              {uploadingImage ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto" />
                  <p className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-gray-500')}>Subiendo imagen...</p>
                </div>
              ) : (
                <>
                  <Upload className={clsx('w-8 h-8 mx-auto mb-2', isDark ? 'text-dark-500' : 'text-gray-300')} />
                  <p className={clsx('text-xs font-medium', isDark ? 'text-dark-400' : 'text-gray-500')}>
                    Haz clic o arrastra imágenes aquí
                  </p>
                  <p className={clsx('text-xs mt-1', isDark ? 'text-dark-600' : 'text-gray-400')}>
                    JPG, PNG, WebP — máx. 5MB
                  </p>
                </>
              )}
            </div>

            {/* Input oculto */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={(e) => handleImageUpload(e.target.files)}
            />

            {/* Grid de imágenes */}
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {images.map((img, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                        className="p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded-md">
                        Principal
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Featured toggle */}
          <div className={clsx('rounded-2xl border p-5', isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-100')}>
            <div className="flex items-center justify-between">
              <div>
                <p className={clsx('text-sm font-semibold', isDark ? 'text-white' : 'text-dark-900')}>Destacado</p>
                <p className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-gray-500')}>Mostrar en sección destacada</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" {...register('isFeatured')} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-dark-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500" />
              </label>
            </div>
          </div>

          {/* Save */}
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="w-full py-3.5 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-glow disabled:opacity-60"
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEdit ? 'Guardar Cambios' : 'Crear Producto'}
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate('/products')}
            className={clsx('w-full py-3 rounded-xl text-sm font-medium transition-colors', isDark ? 'text-dark-400 hover:bg-dark-800' : 'text-gray-500 hover:bg-gray-100')}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
