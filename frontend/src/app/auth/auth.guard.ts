import { Injectable } from '@angular/core';
import { CanActivate, Router,ActivatedRouteSnapshot } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {

  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const role = route.data['role'];
    if (role === 'admin') {
      const admin = localStorage.getItem('admin');
      if (admin) {
        return true;
      } else {
        this.router.navigate(['/adminlogin']);
        return false;
      }
    } else {
      const student = localStorage.getItem('student');
      if (student) {
        return true;
      } else {
        this.router.navigate(['/userlogin']);
        return false;
      }
      
    }
  }
}