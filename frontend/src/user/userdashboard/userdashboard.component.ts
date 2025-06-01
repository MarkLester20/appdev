import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  cartItems: number;
}

interface FeaturedItem {
  item_id: number;
  name: string;
  description: string;
  image_url: string;
  min_price: number;
  max_price: number;
  total_stock: number;
}

interface CategoryStat {
  category: string;
  item_count: number;
  total_stock: number;
}

@Component({
  selector: 'app-userdashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './userdashboard.component.html',
  styleUrl: './userdashboard.component.css'
})
export class UserdashboardComponent implements OnInit {
  userFullName: string = '';
  dashboardStats: DashboardStats = {
    totalOrders: 0,
    pendingOrders: 0,
    cartItems: 0
  };
  featuredItems: FeaturedItem[] = [];
  categoryStats: CategoryStat[] = [];

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.loadUserProfile();
    this.loadDashboardStats();
    this.loadFeaturedItems();
    this.loadCategoryStats();
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
  

  loadDashboardStats(): void {
    this.http.get<{status: boolean, data: DashboardStats}>('http://localhost:3000/api/user/dashboard-stats', {
      withCredentials: true
    })
    .subscribe({
      next: (res) => {
        if (res.status) {
          this.dashboardStats = res.data;
        }
      },
      error: (err) => {
        console.error('Error loading dashboard stats:', err);
      }
    });
  }

  loadFeaturedItems(): void {
    this.http.get<{status: boolean, data: FeaturedItem[]}>('http://localhost:3000/api/items/featured')
    .subscribe({
      next: (res) => {
        if (res.status) {
          this.featuredItems = res.data.slice(0, 1); 
        }
      },
      error: (err) => {
        console.error('Error loading featured items:', err);
      }
    });
  }

  loadCategoryStats(): void {
    this.http.get<{status: boolean, data: CategoryStat[]}>('http://localhost:3000/api/items/categories/stats')
    .subscribe({
      next: (res) => {
        if (res.status) {
          this.categoryStats = res.data;
        }
      },
      error: (err) => {
        console.error('Error loading category stats:', err);
      }
    });
  }

  getDisplayCategories(): CategoryStat[] {
    if (this.categoryStats.length > 0) {
      return this.categoryStats;
    } else {
      // Return default categories with all required properties
      return [
        { category: 'Women', item_count: 0, total_stock: 0 },
        { category: 'Men', item_count: 0, total_stock: 0 },
        { category: 'PE', item_count: 0, total_stock: 0 },
        { category: 'NSTP', item_count: 0, total_stock: 0 }
      ];
    }
  }

  getImageUrl(imagePath: string): string {
    if (!imagePath) return 'samplepic.png';
    return imagePath.startsWith('http') ? imagePath : `http://localhost:3000${imagePath}`;
  }

  getCategoryImage(category: string): string {
    switch (category.toLowerCase()) {
      case 'women': return 'women.png';
      case 'men': return 'men.png';
      case 'pe': return 'pe.png';
      case 'nstp': return 'nstp.png';
      default: return 'women.png';
    }
  }

  navigateToShop(category?: string): void {
    if (category) {
      this.router.navigate(['/usershop'], { queryParams: { category: category.toLowerCase() } });
    } else {
      this.router.navigate(['/usershop']);
    }
  }

  getCartBadgeCount(): number {
    return this.dashboardStats.cartItems;
  }

  getPurchaseBadgeCount(): number {
    return this.dashboardStats.pendingOrders;
  }
}