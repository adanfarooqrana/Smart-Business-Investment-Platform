/**
 * Order status email notification service for storefront orders.
 * Dispatches automated transactional emails via EmailJS API endpoint
 * and records notification audit logs in Firebase Realtime Database.
 */

import { db } from "../firebase";
import { ref, set } from "firebase/database";

export interface OrderEmailData {
  orderId: string;
  customerEmail: string;
  customerName: string;
  businessName: string;
  totalAmount: number;
  storefrontUrl?: string;
  ownerUid?: string;
}

export type OrderStatusType = 'accepted' | 'cancelled' | 'delivered';

export type OrderEmailPayload = OrderEmailData & {
  status?: "accepted" | "declined" | "delivered" | "cancelled";
};

export const sendOrderStatusEmail = async (
  orderData: OrderEmailData | OrderEmailPayload,
  statusOverride?: OrderStatusType
): Promise<boolean> => {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID_ORDER_STATUS;
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    console.warn("EmailJS credentials missing in environment variables.");
    return false;
  }

  // Normalize status (convert "declined" to "cancelled")
  const rawStatus = statusOverride || (orderData as OrderEmailPayload).status || 'accepted';
  const status: OrderStatusType = rawStatus === 'declined' ? 'cancelled' : (rawStatus as OrderStatusType);

  const businessName = orderData.businessName || "Store Owner";
  let statusSubject = "";
  let statusMessage = "";

  if (status === 'accepted') {
    statusSubject = `Order #${orderData.orderId} Confirmed - ${businessName}`;
    statusMessage = `Great news! ${businessName} has accepted your order and it is now being prepared for dispatch.`;
  } else if (status === 'cancelled') {
    statusSubject = `Order #${orderData.orderId} Update: Cancelled - ${businessName}`;
    statusMessage = `Regrettably, your order #${orderData.orderId} has been cancelled by ${businessName}. If you have any questions, please reach out to store support.`;
  } else if (status === 'delivered') {
    statusSubject = `Order #${orderData.orderId} Delivered! - ${businessName}`;
    statusMessage = `Your order #${orderData.orderId} from ${businessName} has been successfully delivered! Please visit our store page to leave a product review.`;
  }

  const templateParams = {
    to_email: orderData.customerEmail,
    to_name: orderData.customerName || "Valued Customer",
    business_name: businessName,
    order_id: orderData.orderId,
    email_subject: statusSubject,
    status_message: statusMessage,
    order_status: status.toUpperCase(),
    total_amount: orderData.totalAmount || 0,
  };

  // Log audit record to RTDB if ownerUid is supplied
  if (orderData.ownerUid) {
    try {
      const notificationRef = ref(
        db,
        `business_owners/${orderData.ownerUid}/order_notifications/${orderData.orderId}_${status}`
      );
      await set(notificationRef, {
        orderId: orderData.orderId,
        orderNumber: orderData.orderId,
        customer_email: orderData.customerEmail,
        customer_name: orderData.customerName,
        status,
        subject: statusSubject,
        body: statusMessage,
        createdAt: Date.now(),
      });
    } catch (auditErr) {
      console.warn("[orderEmail] Audit log write warning:", auditErr);
    }
  }

  try {
    const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: templateParams,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error(`EmailJS Send Error (${status}):`, error);
    return false;
  }
};

/** Alias for backward compatibility */
export const sendOrderStatusEmailViaBrevo = sendOrderStatusEmail;
