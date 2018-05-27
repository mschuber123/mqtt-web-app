import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private isUserLoggedIn : Boolean;
  private username : string;
  private password : string;

  constructor() { 
  	this.isUserLoggedIn = false;
  }

  setUserLoggedIn(username : string, password : string) {
    this.isUserLoggedIn = true;
    this.username = username;
    this.password = password;
  }

  setUserLoggedOut() {
    this.isUserLoggedIn = false;
    this.username = '';
    this.password = '';
  }

  getUserLoggedIn() {
  	return this.isUserLoggedIn;
  }
  getUsername() {
  	return this.username;
  }
  getPassword() {
  	return this.password;
  }
}
