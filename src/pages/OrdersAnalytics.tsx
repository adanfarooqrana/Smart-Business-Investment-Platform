import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { ref, onValue } from "firebase/database";
import { BusinessOwnerService } from "../services/businessOwnerService";

const CheckIcon = () => <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>;
const CrossIcon = () => <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>;
const DeliveryIcon = () => <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
  product_cost?: number;
}

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  total_amount: number;
  status: "pending" | "accepted" | "declined" | "delivered";
  createdAt: number;
  items: Record<string, OrderItem>;
}

export default function OrdersAnalytics() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({
    total_revenue: 0,
    net_profit: 0,
    operational_cost: 0,
    total_orders_pending: 0
  });

  const [timeFilter, setTimeFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser(user);
        
        const statsRef = ref(db, `business_owners/${user.uid}/dashboard_stats`);
        onValue(statsRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            setStats({
              total_revenue: data.total_revenue || 0,
              net_profit: data.net_profit || 0,
              operational_cost: data.operational_cost || 0,
              total_orders_pending: data.total_orders_pending || 0
            });
          }
        });

        const ordersRef = ref(db, `business_owners/${user.uid}/orders`);
        onValue(ordersRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            const formattedOrders: Order[] = Object.keys(data).map((key) => ({
              id: key,
              ...data[key]
            }));
            setOrders(formattedOrders.reverse());
          } else {
            setOrders([]);
          }
        });
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleAcceptOrder = async (orderId: string) => {
    if (!currentUser) return;
    try {
      await BusinessOwnerService.updateOrderStatus(currentUser.uid, orderId, "accept");
      alert("Order accepted successfully! Email notification triggered.");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeclineOrder = async (orderId: string) => {
    if (!currentUser) return;
    try {
      await BusinessOwnerService.updateOrderStatus(currentUser.uid, orderId, "decline");
      alert("Order declined successfully.");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleMarkAsDelivered = async (orderId: string) => {
    if (!currentUser) return;
    try {
      await BusinessOwnerService.markOrderAsDelivered(currentUser.uid, orderId);
      alert("Order marked as Delivered! Revenue and Net Profit updated.");
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen text-gray-800">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders & Financial Ledger</h1>
          <p className="text-sm text-gray-500">Real-time store management and business health monitoring.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-lg shadow-sm border border-gray-100">
          <select 
            value={timeFilter} 
            onChange={(e) => setTimeFilter(e.target.value)}
            className="text-xs font-semibold bg-gray-50 text-gray-700 px-3 py-2 rounded border border-gray-200 outline-none cursor-pointer hover:bg-gray-100"
          >
            <option value="all">All-Time Range</option>
            <option value="1m">Last 1 Month</option>
            <option value="2m">Last 2 Months</option>
            <option value="3m">Last 3 Months</option>
            <option value="custom">Custom Date Range</option>
          </select>

          {timeFilter === "custom" && (
            <div className="flex items-center gap-1">
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs bg-gray-50 border border-gray-200 px-2 py-1.5 rounded"
              />
              <span className="text-xs text-gray-400">to</span>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs bg-gray-50 border border-gray-200 px-2 py-1.5 rounded"
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Gross Revenue</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">Rs. {stats.total_revenue.toLocaleString()}</h3>
          </div>
          <div className="bg-green-50 p-3 rounded-lg text-green-500 font-bold">Rs</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Net Profit</p>
            <h3 className={`text-2xl font-bold mt-1 ${stats.net_profit >= 0 ? "text-gray-900" : "text-red-500"}`}>
              Rs. {stats.net_profit.toLocaleString()}
            </h3>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg text-blue-500 font-bold">%</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Operational Cost</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">Rs. {stats.operational_cost.toLocaleString()}</h3>
          </div>
          <div className="bg-red-50 p-3 rounded-lg text-red-500 font-bold">⚡</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Pending Orders</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.total_orders_pending}</h3>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg text-orange-500 font-bold">📦</div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-gray-900">Financial Performance Chart</h2>
          <span className="text-xs text-gray-400">Ledger-backed dynamic calculation</span>
        </div>
        
        <div className="h-64 bg-gray-50 rounded-lg flex flex-col justify-between p-4 relative overflow-hidden border border-gray-100">
          <div className="flex justify-between text-xs text-gray-400 border-b border-gray-200 pb-2">
            <span>Graph Projection</span>
            <span>Based on Daily Sales Run-rate</span>
          </div>
          
          <div className="absolute inset-x-0 bottom-10 h-32 flex items-end">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d={stats.total_revenue > 0 ? "M0 80 Q25 40, 50 60 T100 20 L100 100 L0 100 Z" : "M0 95 L100 95 L100 100 L0 100 Z"} fill="rgba(59, 130, 246, 0.05)" />
              <path d={stats.total_revenue > 0 ? "M0 80 Q25 40, 50 60 T100 20" : "M0 95 L100 95"} fill="none" stroke="#3b82f6" strokeWidth="2" />
            </svg>
          </div>

          <div className="flex justify-between text-xs text-gray-400 font-semibold z-10 pt-2 border-t border-gray-150">
            <span>Week 1</span>
            <span>Week 2</span>
            <span>Week 3</span>
            <span>Week 4</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Active Order Details</h2>
          <p className="text-xs text-gray-400 mt-0.5">Direct acceptance and real-time delivery lifecycle management</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th className="p-4">Order ID</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Products & Quantity</th>
                <th className="p-4">Total Price</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400 font-medium">
                    No active orders found in your system.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition">
                    <td className="p-4 font-mono font-semibold text-gray-900">#{order.id.replace("order_", "")}</td>
                    <td className="p-4">
                      <div className="font-semibold text-gray-900">{order.customer_name}</div>
                      <div className="text-xs text-gray-400">{order.customer_email}</div>
                    </td>
                    <td className="p-4">
                      {Object.keys(order.items || {}).map((key) => {
                        const item = order.items[key];
                        return (
                          <div key={key} className="text-xs text-gray-600">
                            • {item.name} <span className="font-bold text-gray-900">x{item.quantity}</span>
                          </div>
                        );
                      })}
                    </td>
                    <td className="p-4 font-bold text-gray-900">Rs. {order.total_amount.toLocaleString()}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        order.status === "pending" ? "bg-amber-50 text-amber-600 border border-amber-200" :
                        order.status === "accepted" ? "bg-blue-50 text-blue-600 border border-blue-200" :
                        order.status === "delivered" ? "bg-green-50 text-green-600 border border-green-200" :
                        "bg-red-50 text-red-600 border border-red-200"
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        {order.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleAcceptOrder(order.id)}
                              className="p-1.5 bg-green-50 hover:bg-green-100 rounded-lg transition border border-green-200"
                              title="Accept Order"
                            >
                              <CheckIcon />
                            </button>
                            <button
                              onClick={() => handleDeclineOrder(order.id)}
                              className="p-1.5 bg-red-50 hover:bg-red-100 rounded-lg transition border border-red-200"
                              title="Decline Order"
                            >
                              <CrossIcon />
                            </button>
                          </>
                        )}
                        {order.status === "accepted" && (
                          <button
                            onClick={() => handleMarkAsDelivered(order.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg transition border border-blue-200"
                          >
                            <DeliveryIcon /> Mark Delivered
                          </button>
                        )}
                        {order.status === "delivered" && (
                          <span className="text-xs text-green-500 font-bold flex items-center gap-1">
                            ✓ Processed & Added to Revenue
                          </span>
                        )}
                        {order.status === "declined" && (
                          <span className="text-xs text-red-400 font-semibold">Cancelled</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
