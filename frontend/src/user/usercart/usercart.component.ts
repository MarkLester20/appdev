import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-usercart',
  standalone: true,
  imports: [ CommonModule, RouterLink ],
  templateUrl: './usercart.component.html',
  styleUrl: './usercart.component.css'
})
export class UsercartComponent {
     userFullName: string = '';

  constructor(private http: HttpClient) {}
  ngOnInit(): void {
    this.http.get<{status: boolean, full_name: string}>('http://localhost:3000/api/user/profile', {
  withCredentials: true
  })
  .subscribe({
    next: (res) => {
      if (res.status) {
        this.userFullName = res.full_name;
      }
    },
    error: () => {
      this.userFullName = '';
    }
  });
  }

}
