import { Routes } from '@angular/router';
import { AdminloginComponent } from '../admin/adminlogin/adminlogin.component';
import { AdmindashboardComponent } from '../admin/admindashboard/admindashboard.component';
import { AdmininventoryComponent } from '../admin/admininventory/admininventory.component';
import { AdminordersComponent } from '../admin/adminorders/adminorders.component';
import { AdminpendingComponent } from '../admin/adminpending/adminpending.component';
import { AdminannouncementComponent } from '../admin/adminannouncement/adminannouncement.component';

import { UserloginComponent } from '../user/userlogin/userlogin.component';
import { UserdashboardComponent } from '../user/userdashboard/userdashboard.component';
import { UsershopComponent } from '../user/usershop/usershop.component';    
import { UsercartComponent } from '../user/usercart/usercart.component';
import { UserpurchaseComponent } from '../user/userpurchase/userpurchase.component';
import { ProductDetailComponent } from '../user/usershop/product-detail.component';
import { CategoryProductsComponent } from '../user/usershop/category-products.component';
import { AuthGuard } from './auth/auth.guard';

export const routes: Routes = [
    {path: '', redirectTo: '/adminlogin', pathMatch: 'full'},
    {path: 'adminlogin', component: AdminloginComponent},
    {path: 'admindashboard', component: AdmindashboardComponent, canActivate: [AuthGuard], data: { role: 'admin' }},
    {path: 'admininventory', component: AdmininventoryComponent, canActivate: [AuthGuard], data: { role: 'admin' }},
    {path: 'adminorders', component: AdminordersComponent, canActivate: [AuthGuard], data: { role: 'admin' }},
    {path: 'adminpending', component: AdminpendingComponent, canActivate: [AuthGuard], data: { role: 'admin' }},
    {path: 'adminannouncement', component: AdminannouncementComponent, canActivate: [AuthGuard], data: { role: 'admin' }},

    {path: 'userlogin', component: UserloginComponent},
    {path: 'userdashboard', component: UserdashboardComponent, canActivate: [AuthGuard], data: { role: 'user' }},
    {path: 'usershop', component: UsershopComponent, canActivate: [AuthGuard], data: { role: 'user' }},
    {path: 'usercart', component: UsercartComponent, canActivate: [AuthGuard], data: { role: 'user' }},
    {path: 'userpurchase', component: UserpurchaseComponent, canActivate: [AuthGuard], data: { role: 'user' }},
    {path: 'category/:category', component: CategoryProductsComponent, canActivate: [AuthGuard], data: { role: 'user' }},
    {path: 'product/:id', component: ProductDetailComponent, canActivate: [AuthGuard], data: { role: 'user' }},
];