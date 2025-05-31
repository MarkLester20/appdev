import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdmininventoryComponent } from './admininventory.component';

describe('AdmininventoryComponent', () => {
  let component: AdmininventoryComponent;
  let fixture: ComponentFixture<AdmininventoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdmininventoryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdmininventoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
