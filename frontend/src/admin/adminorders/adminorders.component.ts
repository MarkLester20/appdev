import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
@Component({
  selector: 'app-adminorders',
  standalone: true,
  imports: [ CommonModule, RouterLink ],
  templateUrl: './adminorders.component.html',
  styleUrl: './adminorders.component.css'
})
export class AdminordersComponent implements OnInit {
   orders: any[] = [];
  constructor(private http: HttpClient, private router: Router) { }

  ngOnInit(): void {
    this.loadOrders();
  }
   loadOrders(): void {
    this.http.get<any>('http://localhost:3000/api/admin/orders', { withCredentials: true })
      .subscribe({
        next: res => {
          if (res.status) {
            this.orders = res.data;
          }
        },
        error: err => {
          this.orders = [];
        }
      });
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
markAsPaid(order_id: number): void {
  this.http.put(`http://localhost:3000/api/admin/orders/${order_id}/paid`, {}, { withCredentials: true })
    .subscribe({
     next: (res: any) =>  {
        if (res.status) {
          alert('Order marked as paid!');
          this.loadOrders();
        } else {
          alert(res.message || 'Failed to mark as paid');
        }
      },
      error: () => alert('Failed to mark as paid')
    });
}

expireOrder(order_id: number): void {
  if (!confirm('Are you sure you want to expire this order?')) return;
  this.http.delete(`http://localhost:3000/api/admin/orders/${order_id}`, { withCredentials: true })
    .subscribe({
      next: (res: any) =>  {
        if (res.status) {
          alert('Order expired and deleted!');
          this.loadOrders();
        } else {
          alert(res.message || 'Failed to expire order');
        }
      },
      error: () => alert('Failed to expire order')
    });
}
}
