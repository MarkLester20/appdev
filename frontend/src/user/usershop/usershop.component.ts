import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface CategoryStats {
  category: string;
  item_count: number;
  total_stock: number;
}

@Component({
  selector: 'app-usershop',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './usershop.component.html',
  styleUrl: './usershop.component.css'
})
export class UsershopComponent implements OnInit {
  userFullName: string = '';
  categoryStats: CategoryStats[] = [];
  loading: boolean = true;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.loadUserProfile();
    this.loadCategoryStats();
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

  loadCategoryStats(): void {
    this.http.get<{status: boolean, data: CategoryStats[]}>('http://localhost:3000/api/items/categories/stats')
      .subscribe({
        next: (res) => {
          if (res.status && res.data) {
            this.categoryStats = res.data;
          }
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading category stats:', err);
          this.loading = false;
        }
      });
  }

  getCategoryByName(categoryName: string): CategoryStats | undefined {
    return this.categoryStats.find(cat => cat.category === categoryName);
  }

  viewCategoryProducts(categoryName: string): void {
    // Convert category name to URL-friendly format
    const urlFriendlyCategory = categoryName.toLowerCase();
    // Navigate to category products page
    this.router.navigate(['/category', urlFriendlyCategory]);
  }
}