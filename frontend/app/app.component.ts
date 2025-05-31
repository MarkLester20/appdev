import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AdminloginComponent } from '../admin/adminlogin/adminlogin.component';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AdminloginComponent, HttpClientModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'frontend';
}
