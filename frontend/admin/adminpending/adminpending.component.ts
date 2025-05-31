import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-adminpending',
  standalone: true,
  imports: [ CommonModule, RouterLink, FormsModule ],
  templateUrl: './adminpending.component.html',
  styleUrl: './adminpending.component.css'
})
export class AdminpendingComponent {

}
