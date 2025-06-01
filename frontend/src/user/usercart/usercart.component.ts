import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { UserCartService } from './usercart.service';

@Component({
  selector: 'app-usercart',
  standalone: true,
  imports: [ CommonModule, RouterLink ],
  templateUrl: './usercart.component.html',
  styleUrl: './usercart.component.css'
})
export class UsercartComponent implements OnInit {
  cartItems: any[] = [];
  cartTotal: number = 0;
  cartCount: number = 0;
 loading = false;
  errorMessage = '';
  success: string = '';
     userFullName: string = '';
   
  constructor(private http: HttpClient,private cartService: UserCartService, private router: Router) {}
  ngOnInit(): void {
    this.fetchCart();
    
    this.loadUserProfile();
  
  }
  loadUserProfile(): void {
    this.http.get<{status: boolean, data: {fullName: string}}>('http://localhost:3000/api/user/profile', {
      withCredentials: true
    }).subscribe({
      next: (res) => {
        if (res.status && res.data) {
          this.userFullName = res.data.fullName;
        }
      },
      error: () => {
        this.userFullName = '';
      }
    });
  }
fetchCart(): void {
    this.loading = true;
    this.cartService.getCart().subscribe({
      next: (res) => {
        this.cartItems = res.cart || [];
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = 'Failed to load cart.';
        this.loading = false;
      }
    });
}
placeOrder(cart_id: number): void {
  this.cartService.placeOrder(cart_id).subscribe({
    next: (res) => {
      if (res.status) {
        alert('Order placed successfully!');
       this.fetchCart();
        this.router.navigate(['/userpurchase']);
      } else {
        alert(res.message || 'Failed to place order');
      }
    },
    error: () => alert('Failed to place order')
  });
}
  updateQuantity(item: any, change: number): void {
    const newQuantity = item.quantity + change;
    if (newQuantity < 1) return;

    this.cartService.updateQuantity(item.cart_id, newQuantity).subscribe({
      next: () => {
        item.quantity = newQuantity;
        item.total = newQuantity * item.price;
      },
      error: () => alert('Failed to update quantity')
    });
  }

  deleteItem(item: any): void {
    if (!confirm('Are you sure you want to remove this item?')) return;

    this.cartService.deleteItem(item.cart_id).subscribe({
      next: () => {
        this.cartItems = this.cartItems.filter(i => i.cart_id !== item.cart_id);
      },
      error: () => alert('Failed to delete item')
    });
  }

  getTotalPrice(): number {
    return this.cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  }
}
