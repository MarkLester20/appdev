import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserpurchaseComponent } from './userpurchase.component';

describe('UserpurchaseComponent', () => {
  let component: UserpurchaseComponent;
  let fixture: ComponentFixture<UserpurchaseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserpurchaseComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserpurchaseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
