// @ts-ignore
import html2pdf from 'html2pdf.js';

const TASKS_SPORT = [
  "Lavado de cuadro y transmisión",
  "Lubricación y medición de desgaste de cadena",
  "Regulado de Cambios",
  "Regulado de frenos (mecánicos)",
  "Chequeo de desgaste de pastillas",
  "Chequeo de desgaste de transmisión",
  "Control de presión de neumáticos y tornillería"
];

const TASKS_EXPERT = [
  "Lavado de cuadro y transmisión",
  "Lubricación y medición de desgaste de cadena",
  "Regulado de Cambios",
  "Regulado de frenos (mecánicos)",
  "Chequeo de desgaste de pastillas",
  "Chequeo de desgaste de transmisión",
  "Control de presión de neumáticos y tornillería",
  "Desarme completo de caja pedalera y limpieza",
  "Desarme completo de juego de dirección y limpieza",
  "Limpieza de transmisión en batea de ultrasonido",
  "Engrase general de rodamientos",
  "Centrado de ruedas profesional"
];

export const printServiceReport = (
  job: any,
  clientName: string = 'Cliente',
  bikeModel: string = 'Bicicleta',
  clientDni: string = '',
  clientPhone: string = ''
) => {
  if (!job) return;

  // --- Logic ---
  const serviceTypeRaw = job.service_type || job.serviceType || "General";
  const serviceType = serviceTypeRaw.toUpperCase();
  let serviceTasks: string[] = [];

  if (serviceType.includes('SPORT')) serviceTasks = TASKS_SPORT;
  else if (serviceType.includes('EXPERT')) serviceTasks = TASKS_EXPERT;
  // Logic for "OTRO" or undefined types: Use notes as the breakdown
  else if (job.notes) {
    serviceTasks = job.notes.split('\n').filter((t: string) => t.trim().length > 0);
  }

  const basePrice = Number(job.basePrice) || 0;
  const extraItems = job.extraItems || [];
  const invoiceRows: any[] = [];

  // Build Rows
  // Header Row
  invoiceRows.push({ description: `SERVICE ${serviceType}`, price: basePrice, isHeader: true });

  // Task Rows (Breakdown)
  serviceTasks.forEach(task => invoiceRows.push({ description: task, price: 0, isTask: true }));

  // Extra Items
  extraItems.forEach((item: any) => invoiceRows.push({ description: item.description, price: Number(item.price) || 0, isExtra: true }));

  const grandTotal = basePrice + extraItems.reduce((acc: number, item: any) => acc + (Number(item.price) || 0), 0);
  const dateStr = new Date().toLocaleDateString('es-AR');

  // --- HTML TEMPLATE (Clean, White, No ID, No Signature) ---
  const element = document.createElement('div');
  element.innerHTML = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; max-width: 800px; margin: 0 auto; background: white; padding: 40px;">
      
      <div style="border-bottom: 2px solid #f97316; padding-bottom: 20px; margin-bottom: 40px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
           <img src="${window.location.origin}/img/logo_full.png" alt="ProBikes" style="height: 85px;" />
        </div>
        <div style="text-align: right;">
           <div style="font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 1px;">Informe de Servicio</div>
           <div style="font-size: 16px; font-weight: 700;">${dateStr}</div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
        <div>
           <div style="font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Cliente</div>
           <div style="font-size: 20px; font-weight: 600; margin-bottom: 5px; color: #111;">${clientName}</div>
           <div style="font-size: 12px; color: #666;">
             ${clientDni ? `DNI: ${clientDni}` : ''} 
             ${clientDni && clientPhone ? ' • ' : ''} 
             ${clientPhone ? `Tel: ${clientPhone}` : ''}
           </div>
        </div>
        <div style="text-align: right;">
           <div style="font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Bicicleta</div>
           <div style="font-size: 20px; font-weight: 600; margin-bottom: 5px; color: #111;">${bikeModel}</div>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <thead>
          <tr>
            <th style="text-align: left; padding: 8px 0; border-bottom: 1px solid #ddd; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #999;">Descripción</th>
            <th style="text-align: right; padding: 8px 0; border-bottom: 1px solid #ddd; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #999;">Precio</th>
          </tr>
        </thead>
        <tbody>
          ${invoiceRows.map(row => {
    const price = row.price > 0 ? `$ ${row.price.toLocaleString('es-AR')}` : '';
    if (row.isHeader) {
      return `<tr><td style="padding: 12px 0 4px 0; font-weight: 700; font-size: 14px; color: #f97316;">${row.description}</td><td style="padding: 12px 0 4px 0; text-align: right; font-weight: 700; font-size: 14px;">${price}</td></tr>`;
    }
    if (row.isTask) {
      // Indented, bulleted, smaller gray text
      return `<tr><td style="padding: 1px 0 1px 15px; font-size: 11px; color: #666; line-height: 1.4;">• ${row.description}</td><td></td></tr>`;
    }
    return `<tr><td style="padding: 8px 0; border-bottom: 1px solid #eee; font-size: 14px; color: #444;">${row.description}</td><td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; font-family: monospace; font-size: 14px;">${price}</td></tr>`;
  }).join('')}
        </tbody>
      </table>

      <div style="text-align: right; margin-top: 20px; padding-top: 15px; border-top: 2px solid #333;">
         <div style="font-size: 30px; font-weight: 900; color: #333;">$ ${grandTotal.toLocaleString('es-AR')}</div>
      </div>

      ${job.notes ? `
        <div style="margin-top: 50px; padding-top: 15px; border-top: 1px solid #eee;">
          <div style="font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Observaciones</div>
          <div style="font-size: 12px; color: #555;">${job.notes}</div>
        </div>
      ` : ''
    }

<div style="margin-top: 60px; text-align: center; font-size: 10px; color: #ccc;" > PROBIKES SERVICE CENTER </div>
  </div>
    `;

  const opt = {
    margin: 0,
    filename: `Informe_Service.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  html2pdf().set(opt as any).from(element).save();
};
