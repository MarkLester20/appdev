import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {

  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const role = route.data['role'];
    
    if (role === 'admin') {
      const admin = localStorage.getItem('admin');
      const adminId = localStorage.getItem('admin_id');
      if (admin && adminId) {
        return true;
      } else {
        this.router.navigate(['/adminlogin']);
        return false;
      }
    } else if (role === 'student' || role === 'user') {
      const student = localStorage.getItem('student');
      const studentId = localStorage.getItem('student_id');
      if (student && studentId) {
        return true;
      } else {
        this.router.navigate(['/userlogin']);
        return false;
      }
    }
    
    // Default case - if no role is specified, redirect to user login
    this.router.navigate(['/userlogin']);
    return false;
  }
}