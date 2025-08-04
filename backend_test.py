#!/usr/bin/env python3
"""
Backend API Testing for Afrikanet Online Platform
Tests all backend endpoints with realistic data
"""

import requests
import json
from datetime import datetime, timedelta
import time
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Get backend URL from frontend .env
BACKEND_URL = os.getenv('REACT_APP_BACKEND_URL', 'https://4457a8ce-dc76-424e-bf75-63de1c6ced48.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

print(f"Testing backend at: {API_BASE}")

class AfrikanetAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.test_results = {
            'authentication': False,
            'user_management': False,
            'subscription_crud': False,
            'dashboard_stats': False,
            'alert_system': False,
            'subscription_status': False
        }
        self.created_subscriptions = []
        
    def log_test(self, test_name, success, message=""):
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}: {message}")
        return success
    
    def test_authentication_system(self):
        """Test authentication endpoints with default admin user"""
        print("\n=== Testing Authentication System ===")
        
        # Test login with default admin user
        login_data = {
            "username": "admin",
            "password": "admin123"
        }
        
        try:
            response = self.session.post(f"{API_BASE}/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                if 'access_token' in data and 'user' in data:
                    self.auth_token = data['access_token']
                    self.session.headers.update({'Authorization': f'Bearer {self.auth_token}'})
                    
                    user_info = data['user']
                    expected_fields = ['id', 'username', 'email', 'full_name']
                    
                    if all(field in user_info for field in expected_fields):
                        if user_info['username'] == 'admin':
                            self.test_results['authentication'] = self.log_test(
                                "Admin Login", True, 
                                f"Successfully logged in as {user_info['full_name']} ({user_info['username']})"
                            )
                        else:
                            self.log_test("Admin Login", False, "Wrong user returned")
                    else:
                        self.log_test("Admin Login", False, "Missing user fields in response")
                else:
                    self.log_test("Admin Login", False, "Missing access_token or user in response")
            else:
                self.log_test("Admin Login", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Admin Login", False, f"Exception: {str(e)}")
        
        # Test registration endpoint
        try:
            register_data = {
                "username": "testuser_afrikanet",
                "email": "test@afrikanet.com",
                "full_name": "Utilisateur Test Afrikanet",
                "password": "testpass123"
            }
            
            response = self.session.post(f"{API_BASE}/register", json=register_data)
            
            if response.status_code == 200:
                data = response.json()
                if 'message' in data and 'created successfully' in data['message']:
                    self.log_test("User Registration", True, "New user registered successfully")
                else:
                    self.log_test("User Registration", False, "Unexpected response format")
            elif response.status_code == 400:
                # User might already exist, which is acceptable
                self.log_test("User Registration", True, "Registration endpoint working (user may already exist)")
            else:
                self.log_test("User Registration", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("User Registration", False, f"Exception: {str(e)}")
    
    def test_user_management(self):
        """Test user management endpoints"""
        print("\n=== Testing User Management ===")
        
        if not self.auth_token:
            self.log_test("User Info Retrieval", False, "No auth token available")
            return
        
        try:
            response = self.session.get(f"{API_BASE}/me")
            
            if response.status_code == 200:
                user_data = response.json()
                required_fields = ['id', 'username', 'email', 'full_name', 'is_active', 'created_at']
                
                if all(field in user_data for field in required_fields):
                    if user_data['username'] == 'admin' and user_data['is_active']:
                        self.test_results['user_management'] = self.log_test(
                            "User Info Retrieval", True,
                            f"Retrieved user info for {user_data['full_name']}"
                        )
                    else:
                        self.log_test("User Info Retrieval", False, "Incorrect user data")
                else:
                    self.log_test("User Info Retrieval", False, "Missing required fields")
            else:
                self.log_test("User Info Retrieval", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("User Info Retrieval", False, f"Exception: {str(e)}")
    
    def test_subscription_crud(self):
        """Test subscription CRUD operations with realistic data"""
        print("\n=== Testing Subscription Management CRUD ===")
        
        if not self.auth_token:
            self.log_test("Subscription CRUD", False, "No auth token available")
            return
        
        # Test data for different subscription types
        test_subscriptions = [
            {
                "client_name": "Société Minière du Congo",
                "phone": "+243 81 234 5678",
                "technology": "Starlink",
                "plan": "Business Premium",
                "bandwidth": "500 Mbps",
                "frequency": "Ka-band",
                "amount": 750000,
                "duration_months": 12,
                "start_date": datetime.utcnow().isoformat()
            },
            {
                "client_name": "Banque Commerciale du Congo",
                "phone": "+243 99 876 5432",
                "technology": "VSAT",
                "plan": "Enterprise",
                "bandwidth": "100 Mbps",
                "frequency": "Ku-band",
                "amount": 450000,
                "duration_months": 6,
                "start_date": datetime.utcnow().isoformat()
            },
            {
                "client_name": "Hôpital Général de Kinshasa",
                "phone": "+243 85 111 2233",
                "technology": "VSAT",
                "plan": "Healthcare",
                "bandwidth": "50 Mbps",
                "frequency": "C-band",
                "amount": 250000,
                "duration_months": 24,
                "start_date": (datetime.utcnow() - timedelta(days=700)).isoformat()  # Expired subscription
            }
        ]
        
        # Test CREATE subscriptions
        created_count = 0
        for i, sub_data in enumerate(test_subscriptions):
            try:
                response = self.session.post(f"{API_BASE}/subscriptions", json=sub_data)
                
                if response.status_code == 200:
                    subscription = response.json()
                    if 'id' in subscription and subscription['client_name'] == sub_data['client_name']:
                        self.created_subscriptions.append(subscription['id'])
                        created_count += 1
                        self.log_test(f"Create Subscription {i+1}", True, 
                                    f"Created {sub_data['technology']} subscription for {sub_data['client_name']}")
                    else:
                        self.log_test(f"Create Subscription {i+1}", False, "Invalid response format")
                else:
                    self.log_test(f"Create Subscription {i+1}", False, f"HTTP {response.status_code}: {response.text}")
                    
            except Exception as e:
                self.log_test(f"Create Subscription {i+1}", False, f"Exception: {str(e)}")
        
        # Test READ subscriptions
        try:
            response = self.session.get(f"{API_BASE}/subscriptions")
            
            if response.status_code == 200:
                subscriptions = response.json()
                if isinstance(subscriptions, list) and len(subscriptions) >= created_count:
                    # Check if our created subscriptions are in the list
                    found_subs = [sub for sub in subscriptions if sub['id'] in self.created_subscriptions]
                    if len(found_subs) == len(self.created_subscriptions):
                        self.log_test("Read Subscriptions", True, 
                                    f"Retrieved {len(subscriptions)} subscriptions including our test data")
                        
                        # Check for different statuses
                        statuses = [sub['status'] for sub in subscriptions]
                        unique_statuses = set(statuses)
                        self.log_test("Subscription Statuses", True, 
                                    f"Found subscription statuses: {', '.join(unique_statuses)}")
                    else:
                        self.log_test("Read Subscriptions", False, "Created subscriptions not found in list")
                else:
                    self.log_test("Read Subscriptions", False, "Invalid subscriptions list")
            else:
                self.log_test("Read Subscriptions", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Read Subscriptions", False, f"Exception: {str(e)}")
        
        # Test UPDATE subscription
        if self.created_subscriptions:
            try:
                sub_id = self.created_subscriptions[0]
                update_data = {
                    "client_name": "Société Minière du Congo (Mise à jour)",
                    "phone": "+243 81 234 5678",
                    "technology": "Starlink",
                    "plan": "Business Premium Plus",
                    "bandwidth": "1 Gbps",
                    "frequency": "Ka-band",
                    "amount": 950000,
                    "duration_months": 12,
                    "start_date": datetime.utcnow().isoformat()
                }
                
                response = self.session.put(f"{API_BASE}/subscriptions/{sub_id}", json=update_data)
                
                if response.status_code == 200:
                    updated_sub = response.json()
                    if updated_sub['plan'] == "Business Premium Plus" and updated_sub['bandwidth'] == "1 Gbps":
                        self.log_test("Update Subscription", True, "Successfully updated subscription")
                    else:
                        self.log_test("Update Subscription", False, "Update not reflected in response")
                else:
                    self.log_test("Update Subscription", False, f"HTTP {response.status_code}: {response.text}")
                    
            except Exception as e:
                self.log_test("Update Subscription", False, f"Exception: {str(e)}")
        
        # Test DELETE subscription
        if len(self.created_subscriptions) > 1:
            try:
                sub_id = self.created_subscriptions[-1]  # Delete the last one
                response = self.session.delete(f"{API_BASE}/subscriptions/{sub_id}")
                
                if response.status_code == 200:
                    result = response.json()
                    if 'message' in result and 'deleted successfully' in result['message']:
                        self.created_subscriptions.remove(sub_id)
                        self.log_test("Delete Subscription", True, "Successfully deleted subscription")
                    else:
                        self.log_test("Delete Subscription", False, "Unexpected response format")
                else:
                    self.log_test("Delete Subscription", False, f"HTTP {response.status_code}: {response.text}")
                    
            except Exception as e:
                self.log_test("Delete Subscription", False, f"Exception: {str(e)}")
        
        if created_count > 0:
            self.test_results['subscription_crud'] = True
    
    def test_dashboard_stats(self):
        """Test dashboard statistics API"""
        print("\n=== Testing Dashboard Statistics API ===")
        
        if not self.auth_token:
            self.log_test("Dashboard Stats", False, "No auth token available")
            return
        
        try:
            response = self.session.get(f"{API_BASE}/dashboard/stats")
            
            if response.status_code == 200:
                stats = response.json()
                required_fields = [
                    'total_subscribers', 'monthly_revenue', 'active_subscriptions', 
                    'urgent_alerts', 'technology_breakdown', 'status_breakdown'
                ]
                
                if all(field in stats for field in required_fields):
                    # Validate data types and values
                    if (isinstance(stats['total_subscribers'], int) and 
                        isinstance(stats['monthly_revenue'], int) and
                        isinstance(stats['technology_breakdown'], list) and
                        isinstance(stats['status_breakdown'], dict)):
                        
                        self.test_results['dashboard_stats'] = self.log_test(
                            "Dashboard Stats", True,
                            f"Stats: {stats['total_subscribers']} subscribers, "
                            f"{stats['monthly_revenue']} CDF revenue, "
                            f"{stats['active_subscriptions']} active"
                        )
                        
                        # Test technology breakdown
                        tech_breakdown = stats['technology_breakdown']
                        if tech_breakdown:
                            techs = [item['_id'] for item in tech_breakdown]
                            self.log_test("Technology Breakdown", True, f"Technologies: {', '.join(techs)}")
                        
                        # Test status breakdown
                        status_breakdown = stats['status_breakdown']
                        if 'active' in status_breakdown:
                            self.log_test("Status Breakdown", True, 
                                        f"Active: {status_breakdown['active']}, "
                                        f"Expiring: {status_breakdown.get('expiring', 0)}, "
                                        f"Expired: {status_breakdown.get('expired', 0)}")
                    else:
                        self.log_test("Dashboard Stats", False, "Invalid data types in response")
                else:
                    self.log_test("Dashboard Stats", False, f"Missing fields: {set(required_fields) - set(stats.keys())}")
            else:
                self.log_test("Dashboard Stats", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Dashboard Stats", False, f"Exception: {str(e)}")
        
        # Test revenue chart endpoint
        try:
            response = self.session.get(f"{API_BASE}/dashboard/revenue-chart")
            
            if response.status_code == 200:
                chart_data = response.json()
                if 'labels' in chart_data and 'data' in chart_data:
                    self.log_test("Revenue Chart", True, f"Chart data with {len(chart_data['labels'])} data points")
                else:
                    self.log_test("Revenue Chart", False, "Missing labels or data in chart response")
            else:
                self.log_test("Revenue Chart", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Revenue Chart", False, f"Exception: {str(e)}")
    
    def test_alert_system(self):
        """Test alert system"""
        print("\n=== Testing Alert System ===")
        
        if not self.auth_token:
            self.log_test("Alert System", False, "No auth token available")
            return
        
        try:
            response = self.session.get(f"{API_BASE}/alerts")
            
            if response.status_code == 200:
                alerts = response.json()
                if isinstance(alerts, list):
                    self.test_results['alert_system'] = self.log_test(
                        "Alert Retrieval", True, f"Retrieved {len(alerts)} alerts"
                    )
                    
                    # Check alert structure if alerts exist
                    if alerts:
                        alert = alerts[0]
                        required_fields = ['id', 'subscription_id', 'client_name', 'message', 'alert_type', 'created_at']
                        if all(field in alert for field in required_fields):
                            self.log_test("Alert Structure", True, 
                                        f"Alert for {alert['client_name']}: {alert['message']}")
                        else:
                            self.log_test("Alert Structure", False, "Missing required fields in alert")
                    else:
                        self.log_test("Alert Content", True, "No alerts currently (expected if no expiring subscriptions)")
                else:
                    self.log_test("Alert Retrieval", False, "Response is not a list")
            else:
                self.log_test("Alert Retrieval", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Alert Retrieval", False, f"Exception: {str(e)}")
    
    def test_subscription_status_management(self):
        """Test automatic subscription status management"""
        print("\n=== Testing Subscription Status Management ===")
        
        if not self.auth_token:
            self.log_test("Status Management", False, "No auth token available")
            return
        
        # Get current subscriptions to check status updates
        try:
            response = self.session.get(f"{API_BASE}/subscriptions")
            
            if response.status_code == 200:
                subscriptions = response.json()
                if subscriptions:
                    # Check for different statuses
                    statuses = {}
                    for sub in subscriptions:
                        status = sub['status']
                        statuses[status] = statuses.get(status, 0) + 1
                        
                        # Check if end_date logic is working
                        end_date = datetime.fromisoformat(sub['end_date'].replace('Z', '+00:00'))
                        now = datetime.utcnow().replace(tzinfo=end_date.tzinfo) if end_date.tzinfo else datetime.utcnow()
                        days_until_expiry = (end_date - now).days
                        
                        # Validate status based on expiry date
                        if days_until_expiry < 0 and status != 'expired':
                            self.log_test(f"Status Logic Check", False, 
                                        f"Subscription {sub['client_name']} should be expired but is {status}")
                        elif 0 <= days_until_expiry <= 30 and status not in ['expiring', 'expired']:
                            self.log_test(f"Status Logic Check", False, 
                                        f"Subscription {sub['client_name']} should be expiring but is {status}")
                    
                    self.test_results['subscription_status'] = self.log_test(
                        "Status Management", True,
                        f"Status distribution: {statuses}"
                    )
                else:
                    self.log_test("Status Management", True, "No subscriptions to check status for")
            else:
                self.log_test("Status Management", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Status Management", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Afrikanet Online Backend API Tests")
        print(f"Backend URL: {API_BASE}")
        print("=" * 60)
        
        # Run tests in order
        self.test_authentication_system()
        self.test_user_management()
        self.test_subscription_crud()
        self.test_dashboard_stats()
        self.test_alert_system()
        self.test_subscription_status_management()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(self.test_results.values())
        
        for test_name, result in self.test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{status} - {test_name.replace('_', ' ').title()}")
        
        print(f"\nOverall Result: {passed_tests}/{total_tests} tests passed")
        
        if passed_tests == total_tests:
            print("🎉 All backend tests passed successfully!")
        else:
            print(f"⚠️  {total_tests - passed_tests} test(s) failed")
        
        return self.test_results

if __name__ == "__main__":
    tester = AfrikanetAPITester()
    results = tester.run_all_tests()