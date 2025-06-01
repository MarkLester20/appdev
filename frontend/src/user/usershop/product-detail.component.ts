import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

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
  is_active: number;
  variants: ItemVariant[];
  min_price?: number;
  max_price?: number;
}

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.css'
})
export class ProductDetailComponent implements OnInit {
  product: ProductItem | null = null;
  selectedVariant: ItemVariant | null = null;
  quantity: number = 1;
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
      const itemId = params['id'];
      if (itemId) {
        this.loadProductDetails(itemId);
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

  loadProductDetails(itemId: string): void {
    this.loading = true;
    // Use the new public endpoint for individual product details
    this.http.get<{status: boolean, data: ProductItem}>(`http://localhost:3000/api/items/${itemId}/details`)
      .subscribe({
        next: (res) => {
          if (res.status && res.data) {
            this.product = res.data;
            // Auto-select first available variant
            if (this.product.variants && this.product.variants.length > 0) {
              const availableVariant = this.product.variants.find(v => v.stock > 0);
              this.selectedVariant = availableVariant || this.product.variants[0];
            }
          } else {
            this.error = 'Product not found';
          }
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading product:', err);
          if (err.status === 404) {
            this.error = 'Product not found';
          } else {
            this.error = 'Failed to load product details';
          }
          this.loading = false;
        }
      });
  }

  selectVariant(variant: ItemVariant): void {
    this.selectedVariant = variant;
    this.quantity = 1; // Reset quantity when changing variant
  }

  increaseQuantity(): void {
    if (this.selectedVariant && this.quantity < this.selectedVariant.stock) {
      this.quantity++;
    }
  }

  decreaseQuantity(): void {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  addToCart(): void {
    if (!this.selectedVariant || !this.product) {
      alert('Please select a size');
      return;
    }

    if (this.quantity > this.selectedVariant.stock) {
      alert('Not enough stock available');
      return;
    }

    const cartData = {
      variant_id: this.selectedVariant.variant_id,
      quantity: this.quantity
    };

    this.http.post<{status: boolean, message: string}>('http://localhost:3000/api/cart/add', cartData, {
      withCredentials: true
    }).subscribe({
      next: (res) => {
        if (res.status) {
          alert('Item added to cart successfully!');
        } else {
          alert(res.message || 'Failed to add item to cart');
        }
      },
      error: (err) => {
        console.error('Error adding to cart:', err);
        alert('Failed to add item to cart');
      }
    });
  }

  purchaseNow(): void {
  if (!this.selectedVariant || !this.product) {
    alert('Please select a size');
    return;
  }

  if (this.quantity > this.selectedVariant.stock) {
    alert('Not enough stock available');
    return;
  }

  const cartData = {
    variant_id: this.selectedVariant.variant_id,
    quantity: this.quantity
  };

  // 1. Add to cart
  this.http.post<{status: boolean, message: string, cart_id?: number}>('http://localhost:3000/api/cart/add', cartData, {
    withCredentials: true
  }).subscribe({
    next: (res) => {
      if (res.status) {
        // 2. Get the cart to find the cart_id for this variant
        this.http.get<any>('http://localhost:3000/api/cart', { withCredentials: true }).subscribe({
          next: (cartRes) => {
            const cartItem = (cartRes.cart || []).find((item: any) => item.variant_id === this.selectedVariant!.variant_id);
            if (cartItem) {
              // 3. Place order for this cart item
              this.http.post<{status: boolean, message: string}>(
                `http://localhost:3000/api/cart/place-order/${cartItem.cart_id}`,
                {},
                { withCredentials: true }
              ).subscribe({
                next: (orderRes) => {
                  if (orderRes.status) {
                    alert('Purchase successful!');
                    this.router.navigate(['/userpurchase']);
                  } else {
                    alert(orderRes.message || 'Failed to place order');
                  }
                },
                error: () => alert('Failed to place order')
              });
            } else {
              alert('Failed to find cart item for purchase.');
            }
          },
          error: () => alert('Failed to fetch cart after adding item.')
        });
      } else {
        alert(res.message || 'Failed to add item to cart');
      }
    },
    error: () => alert('Failed to add item to cart')
  });
}

  goBack(): void {
    this.router.navigate(['/usershop']);
  }

  getImageUrl(imageUrl: string): string {
    if (!imageUrl) return 'assets/placeholder.png';
    return imageUrl.startsWith('http') ? imageUrl : `http://localhost:3000${imageUrl}`;
  }
}