import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface ItemVariant {
  variant_id: number;
  size: string;
  stock: number;
  price: number;
}

interface ProductItem {
  item_id: number;
  name: string;
  description: string;
  image_url: string;
  category: string;
  is_active: number;
  variants: ItemVariant[];
  min_price?: number;
  max_price?: number;
}

@Component({
  selector: 'app-category-products',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './category-products.component.html',
  styleUrl: './category-products.component.css'
})
export class CategoryProductsComponent implements OnInit {
  products: ProductItem[] = [];
  categoryName: string = '';
  loading: boolean = true;
  error: string = '';
  userFullName: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadUserProfile();
    this.route.params.subscribe(params => {
      const category = params['category'];
      if (category) {
        
        this.categoryName = this.formatCategoryName(category);
        this.loadCategoryProducts(this.categoryName);
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

  loadCategoryProducts(category: string): void {
    this.loading = true;
    this.http.get<{status: boolean, data: ProductItem[]}>(`http://localhost:3000/api/items/category/${category}`)
      .subscribe({
        next: (res) => {
          if (res.status && res.data) {
            this.products = res.data;
          } else {
            this.error = 'No products found in this category';
          }
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading category products:', err);
          this.error = 'Failed to load products';
          this.loading = false;
        }
      });
  }

  formatCategoryName(urlCategory: string): string {
    // Convert URL-friendly format back to original
    // e.g., 'women' -> 'Women', 'pe' -> 'PE', 'nstp' -> 'NSTP'
    if (urlCategory === 'pe') return 'PE';
    if (urlCategory === 'nstp') return 'NSTP';
    return urlCategory.charAt(0).toUpperCase() + urlCategory.slice(1);
  }

  viewProductDetail(productId: number): void {
    this.router.navigate(['/product', productId]);
  }

  goBack(): void {
    this.router.navigate(['/usershop']);
  }

  getImageUrl(imageUrl: string): string {
    if (!imageUrl) return 'assets/placeholder.png';
    return imageUrl.startsWith('http') ? imageUrl : `http://localhost:3000${imageUrl}`;
  }

  getPriceRange(product: ProductItem): string {
    if (!product.variants || product.variants.length === 0) {
      return '₱0.00';
    }

    const prices = product.variants.map(v => v.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    if (minPrice === maxPrice) {
      return `₱${minPrice.toFixed(2)}`;
    } else {
      return `₱${minPrice.toFixed(2)} - ₱${maxPrice.toFixed(2)}`;
    }
  }

  getAvailableStock(product: ProductItem): number {
    if (!product.variants || product.variants.length === 0) {
      return 0;
    }
    return product.variants.reduce((total, variant) => total + variant.stock, 0);
  }
}