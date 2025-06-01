import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
@Component({
  selector: 'app-adminpending',
  standalone: true,
  imports: [ CommonModule, RouterLink, FormsModule ],
  templateUrl: './adminpending.component.html',
  styleUrl: './adminpending.component.css'
})
export class AdminpendingComponent implements OnInit {
  orders: any[] = [];
  constructor(private http: HttpClient, private router: Router) { }
  ngOnInit(): void {
    this.loadOrderHistory();
  }loadOrderHistory(): void {
  this.http.get<any>('http://localhost:3000/api/admin/orders/history', { withCredentials: true })
    .subscribe({
      next: res => {
        if (res.status) {
          this.orders = res.data;
        }
      },
      error: () => {
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

}
