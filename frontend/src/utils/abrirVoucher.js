import axios from 'axios'

// Abre imágenes protegidas usando el JWT que ya incorpora Axios.
// No coloca el token en enlaces públicos ni en la URL del navegador.
export async function abrirVoucher(imagenUrl) {
  const ventana = window.open('', '_blank');
  if (!ventana) throw new Error('El navegador bloqueó la nueva pestaña. Permite ventanas emergentes para este sitio.');

  try {
    const respuesta = await axios.get(imagenUrl, { responseType: 'blob' });
    if (!respuesta.data.type.startsWith('image/')) {
      throw new Error('El servidor no devolvió una imagen.');
    }
    const url = URL.createObjectURL(respuesta.data);
    ventana.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (err) {
    ventana.close();
    const motivo = err.response?.status === 404
      ? 'Imagen no disponible. Los vouchers antiguos podrían haberse perdido antes del cambio de almacenamiento.'
      : 'No se pudo abrir la imagen original del voucher.';
    throw new Error(motivo);
  }
}
