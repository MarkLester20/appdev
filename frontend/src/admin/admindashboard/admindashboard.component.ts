import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface DashboardStats {
  newOrders: number;
  pendingOrders: number;
  totalSales: number;
}

interface StockData {
  category: string;
  total_stock: number;
}

@Component({
  selector: 'app-admindashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admindashboard.component.html',
  styleUrl: './admindashboard.component.css'
})
export class AdmindashboardComponent implements OnInit {
  dashboardStats: DashboardStats = {
    newOrders: 0,
    pendingOrders: 0,
    totalSales: 0
  };

  stockData: StockData[] = [];

  loading = true;
  error = '';

  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.loadDashboardData();
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

  loadDashboardData() {
    this.loading = true;
    this.error = '';

    // Load dashboard stats
    this.http.get<{status: boolean, data: DashboardStats}>(`${this.apiUrl}/admin/dashboard-stats`, {
      withCredentials: true
    }).subscribe({
      next: (response) => {
        if (response.status) {
          this.dashboardStats = response.data;
          console.log('Dashboard stats loaded:', this.dashboardStats);
        } else {
          this.error = 'Failed to load dashboard statistics';
        }
        this.loadStockData();
      },
      error: (error) => {
        console.error('Error loading dashboard stats:', error);
        this.error = 'Error loading dashboard statistics';
        this.loading = false;
      }
    });
  }

  loadStockData() {
    this.http.get<{status: boolean, data: StockData[]}>(`${this.apiUrl}/admin/stock-stats`, {
      withCredentials: true
    }).subscribe({
      next: (response) => {
        if (response.status) {
          this.stockData = response.data;
          console.log('Stock data loaded:', this.stockData);
        } else {
          this.error = 'Failed to load stock information';
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading stock data:', error);
        this.error = 'Error loading stock information';
        this.loading = false;
      }
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  }

  formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US').format(num);
  }

  
  getStockByCategory(displayCategory: string): number {
    
    const categoryMap: { [key: string]: string } = {
      "Men's Uniform": "Mens Uniform",
      "Women's Uniform": "Womens Uniform", 
      "P.E. Uniform": "PE Uniform",
      "NSTP Shirt": "NSTP Shirt"
    };
    
    const backendCategory = categoryMap[displayCategory];
    if (!backendCategory) {
      console.warn(`No mapping found for category: ${displayCategory}`);
      return 0;
    }
    
    const found = this.stockData.find(item => item.category === backendCategory);
    const stock = found ? found.total_stock : 0;
    
    console.log(`Stock for ${displayCategory} (${backendCategory}):`, stock);
    return stock;
  }

  // Helper method to get all stock data for debugging
  getAllStockData(): StockData[] {
    return this.stockData;
  }
}