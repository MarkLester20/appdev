import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-adminannouncement',
  standalone: true,
  imports: [ CommonModule, RouterLink, FormsModule ],
  templateUrl: './adminannouncement.component.html',
  styleUrl: './adminannouncement.component.css'
})
export class AdminannouncementComponent {

}
