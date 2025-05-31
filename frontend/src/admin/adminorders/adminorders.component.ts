import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
@Component({
  selector: 'app-adminorders',
  standalone: true,
  imports: [ CommonModule, RouterLink ],
  templateUrl: './adminorders.component.html',
  styleUrl: './adminorders.component.css'
})
export class AdminordersComponent {

}
