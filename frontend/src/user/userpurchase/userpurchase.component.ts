import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { UserCartService } from '../usercart/usercart.service';
@Component({
  selector: 'app-userpurchase',
  standalone: true,
  imports: [ CommonModule, RouterLink ],
  templateUrl: './userpurchase.component.html',
  styleUrl: './userpurchase.component.css'
})
export class UserpurchaseComponent {
     userFullName: string = '';
    purchases: any[] = [];
  constructor(private http: HttpClient,private cartService: UserCartService, private router: Router) {}
  ngOnInit(): void {
    this.loadUserProfile();
  this.loadPurchases();
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
  
  this.http.post('http://localhost:3000/api/user/logout', {}, { withCredentials: true }).subscribe({
    next: () => {
     
      localStorage.removeItem('user'); 
      sessionStorage.clear(); 

      
      this.router.navigate(['/userlogin']).then(() => {
        
        window.history.replaceState(null, '', '/userlogin');
      });

     
      this.closeLogoutModal();
    },
    error: (error) => {
      console.error('Logout error:', error);
      alert('Logout failed. Please try again.');
    }
  });
}
   loadPurchases(): void {
  this.cartService.getPurchases().subscribe({
    next: (res) => {
      console.log('Purchases response:', res); // <-- Add this
      if (res.status) {
        this.purchases = res.data;
      }
    },
    error: () => {
      this.purchases = [];
    }
  });
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
}
