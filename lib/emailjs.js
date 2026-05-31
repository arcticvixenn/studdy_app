export const emailJsConfig = {
  serviceId: "service_381g82f",
  templateId: "template_0h35l23",
  publicKey: "l81H-8AVmco58kVcr",
};

export const generateVerificationCode = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

export const sendEmailVerificationCode = async ({ email, username, code }) => {
  const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      service_id: emailJsConfig.serviceId,
      template_id: emailJsConfig.templateId,
      user_id: emailJsConfig.publicKey,
      template_params: {
        to_email: email,
        username,
        code,
      },
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Не вдалося надіслати код на email.");
  }

  return true;
};
