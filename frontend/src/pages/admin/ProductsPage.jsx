import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import {
  Plus,
  Edit2,
  Trash2,
  Package,
  Search,
  Image as ImageIcon,
  X,
  Upload,
} from "lucide-react";
import toast from "react-hot-toast";

import Input from "../../components/ui/Input.jsx";
import Select from "../../components/ui/Select.jsx";
import Textarea from "../../components/ui/Textarea.jsx";
import Button from "../../components/ui/Button.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Modal from "../../components/ui/Modal.jsx";
import ConfirmDialog from "../../components/ui/ConfirmDialog.jsx";
import Skeleton from "../../components/ui/Skeleton.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";

import { useGetProductsQuery, useCreateProductMutation, useUpdateProductMutation, useDeleteProductMutation } from "../../store/productApi.js";
import { useGetBrandsQuery, useGetCategoriesQuery, useUploadImageMutation } from "../../store/shopApi.js";
import { formatCurrency, cn } from "../../lib/utils.js";

const productSchema = z.object({
  name: z.string().min(2, "Required"),
  description: z.string().min(10, "At least 10 characters"),
  category: z.string().min(1, "Required"),
  brand: z.string().min(1, "Required"),
  basePrice: z.coerce.number().positive("Must be > 0"),
  discountPrice: z.coerce.number().optional().nullable(),
  gender: z.enum(["men", "women", "kids", "unisex"]),
  color: z.string().optional(),
  material: z.string().optional(),
  tags: z.string().optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  images: z.array(z.string()).min(1, "At least one image"),
  sizes: z
    .array(
      z.object({
        size: z.string().min(1),
        stock: z.coerce.number().int().min(0),
      }),
    )
    .min(1, "At least one size"),
});

export default function AdminProductsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { data, isLoading } = useGetProductsQuery({
    limit: 50,
    ...(searchQuery ? { search: searchQuery } : {}),
  });
  const [deleteProduct, { isLoading: deleting }] = useDeleteProductMutation();
  const products = data?.products ?? [];

  const handleDelete = async () => {
    try {
      await deleteProduct(confirmDelete._id).unwrap();
      toast.success("Product deactivated");
      setConfirmDelete(null);
    } catch (e) {
      toast.error(e?.data?.message || "Could not delete");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-black">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">{data?.total || 0} products total</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Add product
        </Button>
      </div>

      <Input
        icon={Search}
        placeholder="Search products..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="max-w-sm"
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState icon={Package} title="No products" message="Create your first product." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Product</th>
                <th className="hidden p-3 text-left md:table-cell">Brand</th>
                <th className="p-3 text-right">Price</th>
                <th className="hidden p-3 text-center sm:table-cell">Stock</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((p) => {
                const totalStock = p.sizes?.reduce((s, v) => s + v.stock, 0) || 0;
                return (
                  <tr key={p._id} className="hover:bg-muted/20">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                          {p.images?.[0] && <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />}
                        </div>
                        <div className="min-w-0">
                          <p className="line-clamp-1 font-semibold">{p.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{p.gender} · {p.color}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden p-3 text-muted-foreground md:table-cell">{p.brand?.name || "—"}</td>
                    <td className="p-3 text-right font-bold">{formatCurrency(p.basePrice)}</td>
                    <td className="hidden p-3 text-center sm:table-cell">
                      <span className={cn("text-sm font-semibold", totalStock === 0 && "text-danger")}>
                        {totalStock}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {p.isActive ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="danger">Inactive</Badge>
                      )}
                      {p.isFeatured && <Badge variant="accent" className="ml-1">Featured</Badge>}
                    </td>
                    <td className="p-3 text-right">
                      <div className="inline-flex gap-1">
                        <button onClick={() => setEditing(p)} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Edit">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => setConfirmDelete(p)} className="rounded p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger" aria-label="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {(createOpen || editing) && (
        <ProductFormModal
          product={editing}
          onClose={() => { setCreateOpen(false); setEditing(null); }}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title={`Deactivate "${confirmDelete?.name}"?`}
        description="The product will be hidden from the store. You can reactivate it later by editing."
        loading={deleting}
      />
    </div>
  );
}

// =================== PRODUCT FORM ===================
function ProductFormModal({ product, onClose }) {
  const isEdit = !!product;
  const { data: brands } = useGetBrandsQuery();
  const { data: categories } = useGetCategoriesQuery();

  const [createProduct, { isLoading: creating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: updating }] = useUpdateProductMutation();
  const [uploadImage, { isLoading: uploading }] = useUploadImageMutation();

  const defaults = product
    ? {
        name: product.name,
        description: product.description,
        category: product.category?._id || product.category,
        brand: product.brand?._id || product.brand,
        basePrice: product.basePrice,
        discountPrice: product.discountPrice || "",
        gender: product.gender,
        color: product.color || "",
        material: product.material || "",
        tags: (product.tags || []).join(", "),
        isFeatured: product.isFeatured,
        isActive: product.isActive,
        images: product.images || [],
        sizes: product.sizes || [{ size: "40", stock: 0 }],
      }
    : {
        name: "",
        description: "",
        category: "",
        brand: "",
        basePrice: "",
        discountPrice: "",
        gender: "unisex",
        color: "",
        material: "",
        tags: "",
        isFeatured: false,
        isActive: true,
        images: [],
        sizes: [
          { size: "40", stock: 0 },
          { size: "41", stock: 0 },
          { size: "42", stock: 0 },
        ],
      };

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm({ resolver: zodResolver(productSchema), defaultValues: defaults });

  const { fields: sizeFields, append: appendSize, remove: removeSize } = useFieldArray({
    control,
    name: "sizes",
  });
  const images = watch("images");

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadImage({ file, folder: "products" }).unwrap();
      setValue("images", [...(images || []), res.url]);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err?.data?.message || "Upload failed");
    }
    e.target.value = "";
  };

  const removeImage = (idx) => {
    setValue("images", images.filter((_, i) => i !== idx));
  };

  const onSubmit = async (data) => {
    const body = {
      ...data,
      tags: data.tags ? data.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      discountPrice: data.discountPrice || null,
    };
    try {
      if (isEdit) {
        await updateProduct({ id: product._id, ...body }).unwrap();
        toast.success("Product updated");
      } else {
        await createProduct(body).unwrap();
        toast.success("Product created");
      }
      onClose();
    } catch (e) {
      toast.error(e?.data?.message || "Could not save");
    }
  };

  return (
    <Modal open onClose={onClose} title={isEdit ? "Edit product" : "New product"} size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Name" error={errors.name?.message} {...register("name")} />
          <Select label="Gender" error={errors.gender?.message} {...register("gender")}>
            <option value="men">Men</option>
            <option value="women">Women</option>
            <option value="kids">Kids</option>
            <option value="unisex">Unisex</option>
          </Select>
        </div>
        <Textarea label="Description" rows={3} error={errors.description?.message} {...register("description")} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Brand" error={errors.brand?.message} {...register("brand")}>
            <option value="">Select brand</option>
            {brands?.brands?.map((b) => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </Select>
          <Select label="Category" error={errors.category?.message} {...register("category")}>
            <option value="">Select category</option>
            {categories?.categories?.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </Select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Base price" type="number" step="0.01" error={errors.basePrice?.message} {...register("basePrice")} />
          <Input label="Discount price (optional)" type="number" step="0.01" {...register("discountPrice")} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Color" {...register("color")} />
          <Input label="Material" {...register("material")} />
          <Input label="Tags" placeholder="comma separated" {...register("tags")} />
        </div>

        {/* Images */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">Images</label>
          <div className="flex flex-wrap gap-2">
            {(images || []).map((img, i) => (
              <div key={i} className="relative h-20 w-20 overflow-hidden rounded-md border border-border">
                <img src={img} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute right-0.5 top-0.5 rounded-full bg-danger p-0.5 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:border-accent hover:text-accent">
              {uploading ? "..." : <><Upload className="h-4 w-4" />Upload</>}
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>
          {errors.images && <p className="mt-1 text-xs text-danger">{errors.images.message}</p>}
          <p className="mt-1 text-xs text-muted-foreground">Requires Cloudinary env vars configured on the backend.</p>
        </div>

        {/* Sizes */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium">Sizes & stock</label>
            <Button type="button" size="sm" variant="outline" onClick={() => appendSize({ size: "", stock: 0 })}>
              <Plus className="h-3 w-3" /> Add size
            </Button>
          </div>
          <div className="space-y-2">
            {sizeFields.map((field, i) => (
              <div key={field.id} className="flex gap-2">
                <Input placeholder="Size (e.g. 42)" {...register(`sizes.${i}.size`)} className="flex-1" />
                <Input type="number" placeholder="Stock" {...register(`sizes.${i}.stock`)} className="w-32" />
                <Button type="button" variant="ghost" onClick={() => removeSize(i)}>
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-accent" {...register("isFeatured")} /> Featured
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-accent" {...register("isActive")} /> Active
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={creating || updating}>{isEdit ? "Update" : "Create"}</Button>
        </div>
      </form>
    </Modal>
  );
}
