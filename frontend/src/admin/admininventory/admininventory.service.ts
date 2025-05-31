import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class AdminInventoryService {
  constructor(private http: HttpClient) {}

  uploadItem(formData: FormData) {
    return this.http.post('http://localhost:3000/api/items/upload', formData);
  }
}