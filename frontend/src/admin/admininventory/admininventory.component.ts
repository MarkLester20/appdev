import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, FormArray, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { AdminInventoryService } from './admininventory.service';
import {  HttpClient } from '@angular/common/http';

interface Item {
  item_id: number;
  name: string;
  description: string;
  image_url: string;
  is_active: number;
  variants: ItemVariant[];
}

interface ItemVariant {
  variant_id: number;
  size: string;
  stock: number;
  price: number;
  available?: number;
  sold?: number;
  pending?: number;
}

@Component({
  selector: 'app-admininventory',
  standalone: true,
  imports: [ CommonModule, RouterLink, ReactiveFormsModule, FormsModule ],
  templateUrl: './admininventory.component.html',
  styleUrl: './admininventory.component.css'
})
export class AdmininventoryComponent implements OnInit {
  itemForm: FormGroup;
  editForm: FormGroup;
  file: File | null = null;
  
  // Data properties
  items: Item[] = [];
  loading: boolean = true;
  expandedVariants: Set<number> = new Set(); // Track which items have expanded variants
  
  // Edit mode properties
  editingItem: Item | null = null;
  showEditModal: boolean = false;
  editImageFile: File | null = null;
  
  // Image update properties
  imageUpdateFiles: Map<number, File> = new Map(); // Track files for each item
  imageUpdateMode: Set<number> = new Set(); // Track which items are in image update mode

  constructor(
    private http: HttpClient,
    private fb: FormBuilder, 
    private inventoryService: AdminInventoryService,
    private router: Router
  ) {
    this.itemForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      sizes: this.fb.array([
        this.createSizeGroup()
      ])
    });

    this.editForm = this.fb.group({
      name: ['', Validators.required],
      description: ['']
    });
  }

  ngOnInit() {
    this.loadInventoryData();
  }
openLogoutModal(): void {
    const modal = document.getElementById('logoutModal');
    if (modal) {
      modal.style.display = 'block';
    }
  }
  closeLogoutModal(): void {
    const modal = document.getElementById('logoutModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

logout(): void {
  
  this.http.post('http://localhost:3000/api/admin/logout', {}, { withCredentials: true }).subscribe({
    next: () => {
     
      localStorage.removeItem('admin'); 
      sessionStorage.clear(); 

      
      this.router.navigate(['/adminlogin']).then(() => {
        
        window.history.replaceState(null, '', '/adminlogin');
      });

     
      this.closeLogoutModal();
    },
    error: (error) => {
      console.error('Logout error:', error);
      alert('Logout failed. Please try again.');
    }
  });
}

  loadInventoryData() {
    this.loading = true;
    
    this.inventoryService.getAllItems().subscribe({
      next: (response: any) => {
        if (response.status) {
          this.items = response.data;
          console.log('Loaded items:', this.items);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading items:', error);
        this.loading = false;
      }
    });
  }

  // Variant management methods
  toggleVariants(itemId: number) {
    if (this.expandedVariants.has(itemId)) {
      this.expandedVariants.delete(itemId);
    } else {
      this.expandedVariants.add(itemId);
    }
  }

  isVariantsExpanded(itemId: number): boolean {
    return this.expandedVariants.has(itemId);
  }

  // Statistics methods
  getTotalStock(variants: ItemVariant[]): number {
    return variants.reduce((total, variant) => total + (variant.stock || 0), 0);
  }

  getAvailableStock(variants: ItemVariant[]): number {
    return variants.reduce((total, variant) => total + (variant.available || variant.stock || 0), 0);
  }

  getSoldStock(variants: ItemVariant[]): number {
    return variants.reduce((total, variant) => total + (variant.sold || 0), 0);
  }

  // Image update methods
  toggleImageUpdateMode(itemId: number) {
    if (this.imageUpdateMode.has(itemId)) {
      this.imageUpdateMode.delete(itemId);
      this.imageUpdateFiles.delete(itemId);
    } else {
      this.imageUpdateMode.add(itemId);
    }
  }

  isImageUpdateMode(itemId: number): boolean {
    return this.imageUpdateMode.has(itemId);
  }

  onImageUpdateFileChange(event: any, itemId: number) {
    const file = event.target.files[0];
    if (file) {
      this.imageUpdateFiles.set(itemId, file);
    }
  }

  updateItemImage(itemId: number) {
    const file = this.imageUpdateFiles.get(itemId);
    if (!file) {
      alert('Please select an image file.');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    this.inventoryService.updateItemImage(itemId, formData).subscribe({
      next: (response: any) => {
        if (response.status) {
          alert('Image updated successfully!');
          this.imageUpdateMode.delete(itemId);
          this.imageUpdateFiles.delete(itemId);
          this.loadInventoryData();
        } else {
          alert('Error updating image: ' + response.message);
        }
      },
      error: (error) => {
        console.error('Error updating image:', error);
        alert('Error updating image. Please try again.');
      }
    });
  }

  cancelImageUpdate(itemId: number) {
    this.imageUpdateMode.delete(itemId);
    this.imageUpdateFiles.delete(itemId);
    
    // Reset file input
    const fileInput = document.querySelector(`#imageFile-${itemId}`) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  // Item edit methods
  editItem(item: Item) {
    this.editingItem = { ...item };
    this.editForm.patchValue({
      name: item.name,
      description: item.description
    });
    this.showEditModal = true;
  }

  onEditImageFileChange(event: any) {
    this.editImageFile = event.target.files[0];
  }

  updateItem() {
    if (!this.editForm.valid || !this.editingItem) {
      alert('Please fill in all required fields.');
      return;
    }

    const formData = new FormData();
    formData.append('name', this.editForm.value.name);
    formData.append('description', this.editForm.value.description || '');
    
    if (this.editImageFile) {
      formData.append('image', this.editImageFile);
    }

    this.inventoryService.updateItem(this.editingItem.item_id, formData).subscribe({
      next: (response: any) => {
        if (response.status) {
          alert('Item updated successfully!');
          this.closeEditModal();
          this.loadInventoryData();
        } else {
          alert('Error updating item: ' + response.message);
        }
      },
      error: (error) => {
        console.error('Error updating item:', error);
        alert('Error updating item. Please try again.');
      }
    });
  }

  closeEditModal() {
    this.showEditModal = false;
    this.editingItem = null;
    this.editImageFile = null;
    this.editForm.reset();
    
    // Reset file input
    const fileInput = document.querySelector('#editImageFile') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  // Item management methods
  updateVariant(variantId: number, stock: number, price: number) {
    if (stock < 0 || price < 0) {
      alert('Stock and price cannot be negative');
      return;
    }

    this.inventoryService.updateItemVariant(variantId, stock, price).subscribe({
      next: (response: any) => {
        if (response.status) {
          alert('Variant updated successfully!');
          this.loadInventoryData();
        } else {
          alert('Error updating variant: ' + response.message);
        }
      },
      error: (error) => {
        console.error('Error updating variant:', error);
        alert('Error updating variant. Please try again.');
      }
    });
  }

  toggleItemStatus(itemId: number, currentStatus: number) {
    const newStatus = currentStatus === 1 ? 0 : 1;
    const action = newStatus === 1 ? 'activate' : 'deactivate';
    
    if (confirm(`Are you sure you want to ${action} this item?`)) {
      this.inventoryService.toggleItemStatus(itemId, newStatus).subscribe({
        next: (response: any) => {
          if (response.status) {
            alert(`Item ${action}d successfully!`);
            this.loadInventoryData();
          } else {
            alert(`Error ${action}ing item: ` + response.message);
          }
        },
        error: (error) => {
          console.error(`Error ${action}ing item:`, error);
          alert(`Error ${action}ing item. Please try again.`);
        }
      });
    }
  }

  deleteItem(itemId: number) {
    if (confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      this.inventoryService.deleteItem(itemId).subscribe({
        next: (response: any) => {
          if (response.status) {
            alert('Item deleted successfully!');
            this.loadInventoryData();
          } else {
            alert('Error deleting item: ' + response.message);
          }
        },
        error: (error) => {
          console.error('Error deleting item:', error);
          alert('Error deleting item. Please try again.');
        }
      });
    }
  }

  // Form methods
  get sizes() {
    return this.itemForm.get('sizes') as FormArray;
  }

  createSizeGroup() {
    return this.fb.group({
      size: ['', Validators.required],
      stock: [0, [Validators.required, Validators.min(0)]],
      price: [0, [Validators.required, Validators.min(0)]]
    });
  }

  addSize() {
    this.sizes.push(this.createSizeGroup());
  }

  removeSize(index: number) {
    if (this.sizes.length > 1) {
      this.sizes.removeAt(index);
    }
  }

  onFileChange(event: any) {
    this.file = event.target.files[0];
  }

  onSubmit() {
    if (!this.itemForm.valid) {
      alert('Please fill in all required fields.');
      return;
    }

    if (!this.file) {
      alert('Please select an image file.');
      return;
    }

    // Validate that all variants have valid data
    const variants = this.itemForm.value.sizes;
    for (let i = 0; i < variants.length; i++) {
      if (!variants[i].size || variants[i].stock < 0 || variants[i].price < 0) {
        alert(`Please check variant ${i + 1}: all fields are required and stock/price cannot be negative.`);
        return;
      }
    }

    const formData = new FormData();
    formData.append('name', this.itemForm.value.name);
    formData.append('description', this.itemForm.value.description);
    formData.append('image', this.file);
    formData.append('variants', JSON.stringify(this.itemForm.value.sizes));
    
    this.inventoryService.uploadItem(formData).subscribe({
      next: (response: any) => {
        if (response.status) {
          alert('Item uploaded successfully!');
          this.resetForm();
          this.loadInventoryData();
        } else {
          alert('Error uploading item: ' + response.message);
        }
      },
      error: (error) => {
        console.error('Error uploading item:', error);
        alert('Error uploading item. Please try again.');
      }
    });
  }

  private resetForm() {
    this.itemForm.reset();
    this.file = null;
    
    // Reset form array to have one empty size group
    while (this.sizes.length > 1) {
      this.sizes.removeAt(1);
    }
    this.sizes.at(0).reset();
    
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }
}