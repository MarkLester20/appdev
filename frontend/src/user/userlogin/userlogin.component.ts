import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
@Component({
  selector: 'app-userlogin',
  standalone: true,
  imports: [ CommonModule, RouterLink, FormsModule, HttpClientModule, MatIconModule],
  templateUrl: './userlogin.component.html',
  styleUrl: './userlogin.component.css'
})
export class UserloginComponent {
  email: string = "";
  password: string = "";
  showPassword: boolean = false;


  errorMessage: string = ""; 

  constructor(private router: Router, private http: HttpClient) { }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  login(): void {
  this.errorMessage = "";

  
  

  if (!this.email) {
    this.errorMessage = "Email is required.";
    return;
  }

  if (!this.password) {
    this.errorMessage = "Password is required.";
    return;
  }

  const loginPayload = {
    email: this.email,
    password_hash: this.password
  };

  this.http.post<any>('http://localhost:3000/api/user/login', loginPayload, {
    withCredentials: true
  })
  .subscribe({
    next: (response) => {
      if (response.status && response.data) {
        localStorage.setItem('student_id', response.data.student_id);
        localStorage.setItem('student', JSON.stringify(response.data));
        this.router.navigate(['/userdashboard']);
      } else {
        this.errorMessage = "Invalid email or password.";
      }
    },
    error: (error) => {
      console.error('Login error:', error);
      this.errorMessage = "Server error. Please try again later.";
    }
  });
}

}
