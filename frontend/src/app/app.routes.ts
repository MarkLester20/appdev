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
import { AuthGuard } from './auth/auth.guard';

export const routes: Routes = [
    {path: '', redirectTo: '/adminlogin', pathMatch: 'full'},
    {path: 'adminlogin', component: AdminloginComponent},
    {path: 'admindashboard', component: AdmindashboardComponent, canActivate: [AuthGuard]},
    {path: 'admininventory', component: AdmininventoryComponent, canActivate: [AuthGuard]},
    {path: 'adminorders', component: AdminordersComponent,  canActivate: [AuthGuard]},
    {path: 'adminpending', component: AdminpendingComponent, canActivate: [AuthGuard]},
    {path: 'adminannouncement', component: AdminannouncementComponent, canActivate: [AuthGuard]},

    {path: 'userlogin', component: UserloginComponent},
    {path: 'userdashboard', component: UserdashboardComponent, canActivate: [AuthGuard]},
    {path: 'usershop', component: UsershopComponent,    canActivate: [AuthGuard]},
    {path: 'usercart', component: UsercartComponent, canActivate: [AuthGuard]},
    {path: 'userpurchase', component: UserpurchaseComponent, canActivate: [AuthGuard]},
];
