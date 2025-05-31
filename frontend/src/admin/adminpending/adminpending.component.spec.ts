import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminpendingComponent } from './adminpending.component';

describe('AdminpendingComponent', () => {
  let component: AdminpendingComponent;
  let fixture: ComponentFixture<AdminpendingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminpendingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminpendingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
