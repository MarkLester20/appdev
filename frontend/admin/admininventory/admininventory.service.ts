import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AdminInventoryService {
  private baseUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  uploadItem(formData: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/items/upload`, formData);
  }

  getStockStats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/stock-stats`, { withCredentials: true });
  }

  getPendingOrdersByCategory(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/pending-orders-by-category`, { withCredentials: true });
  }

  addStock(category: string, quantity: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/add-stock`, 
      { category, quantity }, 
      { withCredentials: true }
    );
  }

  getAllItems(): Observable<any> {
    return this.http.get(`${this.baseUrl}/items/all`, { withCredentials: true });
  }

  updateItemVariant(variantId: number, stock: number, price: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/items/variants/${variantId}`, 
      { stock, price }, 
      { withCredentials: true }
    );
  }

  toggleItemStatus(itemId: number, status: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/items/${itemId}/status`, 
      { is_active: status }, 
      { withCredentials: true }
    );
  }

  deleteItem(itemId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/items/${itemId}`, { withCredentials: true });
  }

  // NEW: Update item details including image
  updateItem(itemId: number, formData: FormData): Observable<any> {
    return this.http.put(`${this.baseUrl}/items/${itemId}`, formData, { withCredentials: true });
  }

  // NEW: Update only item image
  updateItemImage(itemId: number, formData: FormData): Observable<any> {
    return this.http.put(`${this.baseUrl}/items/${itemId}/image`, formData, { withCredentials: true });
  }
}