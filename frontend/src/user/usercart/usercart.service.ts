import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserCartService {
  private baseUrl = 'http://localhost:3000/api/cart'; 

  constructor(private http: HttpClient) {}

  getCart(): Observable<any> {
    return this.http.get(`${this.baseUrl}`, { withCredentials: true });
  }

  updateQuantity(cart_id: number, quantity: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/${cart_id}`, { cart_id, quantity }, { withCredentials: true });
  }

  deleteItem(cart_id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${cart_id}`, { withCredentials: true });
  }
  placeOrder(cart_id: number): Observable<any> {
  return this.http.post(`${this.baseUrl}/place-order/${cart_id}`, {}, { withCredentials: true });
}
getPurchases(): Observable<any> {
  return this.http.get('http://localhost:3000/api/user/recent-orders', { withCredentials: true });
}
}