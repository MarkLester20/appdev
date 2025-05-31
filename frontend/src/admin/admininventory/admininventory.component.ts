import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, FormArray, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { AdminInventoryService } from './admininventory.service';
import { HttpClientModule, HttpClient } from '@angular/common/http';
@Component({
  selector: 'app-admininventory',
  standalone: true,
  imports: [ CommonModule, RouterLink, ReactiveFormsModule,FormsModule, HttpClientModule ],
  templateUrl: './admininventory.component.html',
  styleUrl: './admininventory.component.css'
})
export class AdmininventoryComponent {
  itemForm: FormGroup;
  file: File | null = null;

  constructor(private fb: FormBuilder, private inventoryService: AdminInventoryService) {
    this.itemForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      sizes: this.fb.array([
        this.createSizeGroup()
      ])
    });
  }

  get sizes() {
    return this.itemForm.get('sizes') as FormArray;
  }

  createSizeGroup() {
    return this.fb.group({
      size: ['', Validators.required],
      stock: [0, Validators.required],
      price: [0, Validators.required]
    });
  }

  addSize() {
    this.sizes.push(this.createSizeGroup());
  }

  onFileChange(event: any) {
    this.file = event.target.files[0];
  }

  onSubmit() {
    const formData = new FormData();
    formData.append('name', this.itemForm.value.name);
    formData.append('description', this.itemForm.value.description);
    if (this.file) formData.append('image', this.file);
    formData.append('variants', JSON.stringify(this.itemForm.value.sizes));
    this.inventoryService.uploadItem(formData).subscribe(res => {
      // handle response
    });
  }
}