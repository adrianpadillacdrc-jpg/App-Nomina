package com.nomina.numa.service;

import com.nomina.numa.dto.FacturaNominaDto;
import com.nomina.numa.model.postgres.PagoNomina;
import com.nomina.numa.repository.jpa.PagoNominaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Optional;

import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.*;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.io.font.constants.StandardFonts;

@Service
@RequiredArgsConstructor
public class FacturaNominaService {

    private final PagoNominaRepository pagoRepo;

    private static final Locale LOCALE_CO = new Locale("es", "CO");
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DeviceRgb PURPLE = new DeviceRgb(94, 53, 177);
    private static final DeviceRgb LIGHT_PURPLE = new DeviceRgb(237, 231, 246);

    public FacturaNominaDto generarPdf(Long pagoId) {
        Optional<PagoNomina> opt = pagoRepo.findById(pagoId);
        if (opt.isEmpty()) {
            throw new RuntimeException("Pago no encontrado con id: " + pagoId);
        }
        PagoNomina pago = opt.get();

        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdfDoc = new PdfDocument(writer);
            Document doc = new Document(pdfDoc);
            doc.setMargins(36, 50, 36, 50);

            PdfFont bold = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
            PdfFont regular = PdfFontFactory.createFont(StandardFonts.HELVETICA);

            // --- Encabezado con logo ---
            Table header = new Table(UnitValue.createPercentArray(new float[]{1, 2})).useAllAvailableWidth();

            // Logo
            try (InputStream logoStream = getClass().getResourceAsStream("/static/frontend/assets/logo.1.png")) {
                if (logoStream != null) {
                    byte[] logoBytes = logoStream.readAllBytes();
                    Image logo = new Image(ImageDataFactory.create(logoBytes));
                    logo.setWidth(100);
                    header.addCell(new Cell().add(logo).setBorder(null).setPadding(5));
                } else {
                    header.addCell(new Cell().add(new Paragraph("NUMA STORE S.A.S.").setFont(bold).setFontSize(14)).setBorder(null));
                }
            } catch (Exception e) {
                header.addCell(new Cell().add(new Paragraph("NUMA STORE S.A.S.").setFont(bold).setFontSize(14)).setBorder(null));
            }

            // Título derecho
            Paragraph titulo = new Paragraph()
                    .add(new Text("Comprobante de pago de nómina\n").setFont(bold).setFontSize(13).setFontColor(PURPLE))
                    .add(new Text("N.° CP-" + pago.getFechaPago().getYear() + "-"
                            + (pago.getIdEmpleado() != null ? pago.getIdEmpleado() : pago.getId()) + "\n").setFont(regular).setFontSize(9))
                    .add(new Text("Comprobante Oficial de Nómina").setFont(bold).setFontSize(9)
                            .setFontColor(new DeviceRgb(255, 193, 7)).setBackgroundColor(new DeviceRgb(255, 193, 7)));
            header.addCell(new Cell().add(titulo).setBorder(null).setTextAlignment(TextAlignment.RIGHT).setPadding(5));
            doc.add(header);

            // Línea separadora
            doc.add(new LineSeparator(new com.itextpdf.kernel.pdf.canvas.draw.SolidLine()).setMarginBottom(10));

            // --- Datos del colaborador ---
            Table datosTable = new Table(UnitValue.createPercentArray(new float[]{1, 1, 1})).useAllAvailableWidth();
            datosTable.setBackgroundColor(new DeviceRgb(248, 245, 254));
            datosTable.setBorder(null);

            addDatoCell(datosTable, "Colaborador", pago.getNombreEmpleado() != null ? pago.getNombreEmpleado() : "—", bold, regular);
            addDatoCell(datosTable, "Cédula", pago.getIdEmpleado() != null ? "C.C. " + pago.getIdEmpleado() : "—", bold, regular);
            addDatoCell(datosTable, "Cargo", "—", bold, regular);

            String periodo = pago.getIdNomina() != null ? pago.getIdNomina() : "—";
            String fechaPago = pago.getFechaPago() != null ? pago.getFechaPago().format(DATE_FMT) : "—";
            String salario = formatCOP(pago.getSueldoBase() != null ? pago.getSueldoBase().longValue() : 0L);

            addDatoCell(datosTable, "Período", periodo, bold, regular);
            addDatoCell(datosTable, "Fecha de pago", fechaPago, bold, regular);
            addDatoCell(datosTable, "Salario base mensual", salario, bold, regular);
            doc.add(datosTable);
            doc.add(new Paragraph("\n"));

            // --- Devengados y deducciones ---
            Table conceptos = new Table(UnitValue.createPercentArray(new float[]{1, 1})).useAllAvailableWidth();

            // Devengados
            Cell devCell = new Cell().setBorder(null).setPadding(8);
            devCell.add(new Paragraph("Devengados").setFont(bold).setFontSize(13).setFontColor(PURPLE));
            Table devTable = new Table(UnitValue.createPercentArray(new float[]{3, 1, 1})).useAllAvailableWidth();
            addTableHeader(devTable, "Concepto", "Base", "Valor", bold, LIGHT_PURPLE);
            long sueldoBase = pago.getSueldoBase() != null ? pago.getSueldoBase().longValue() : 0L;
            long totalDev = pago.getTotalDevengado() != null ? pago.getTotalDevengado().longValue() : 0L;
            addTableRow(devTable, "Sueldo básico (15 días)", formatCOP(sueldoBase), formatCOP(totalDev / 2), regular);
            addTableRow(devTable, "Horas extras y recargos", "", formatCOP(0), regular);
            addTotalRow(devTable, "Total devengado", formatCOP(totalDev), bold);
            devCell.add(devTable);
            conceptos.addCell(devCell);

            // Deducciones
            Cell dedCell = new Cell().setBorder(null).setPadding(8);
            dedCell.add(new Paragraph("Deducciones").setFont(bold).setFontSize(13).setFontColor(new DeviceRgb(211, 47, 47)));
            Table dedTable = new Table(UnitValue.createPercentArray(new float[]{3, 1})).useAllAvailableWidth();
            addTableHeader2(dedTable, "Concepto", "Valor", bold, LIGHT_PURPLE);
            long totalDed = pago.getTotalDeducciones() != null ? pago.getTotalDeducciones().longValue() : 0L;
            long salud = Math.round(sueldoBase * 0.04);
            long pension = Math.round(sueldoBase * 0.04);
            addTableRow2(dedTable, "Salud (4% sobre IBC)", "- " + formatCOP(salud), regular);
            addTableRow2(dedTable, "Pensión (4% sobre IBC)", "- " + formatCOP(pension), regular);
            addTotalRow2(dedTable, "Total deducido", "- " + formatCOP(totalDed), bold, new DeviceRgb(211, 47, 47));
            dedCell.add(dedTable);
            conceptos.addCell(dedCell);

            doc.add(conceptos);
            doc.add(new Paragraph("\n"));

            // --- Total neto a pagar ---
            long totalNeto = pago.getTotalPagar() != null ? pago.getTotalPagar().longValue() : 0L;
            Table totalTable = new Table(UnitValue.createPercentArray(new float[]{1})).useAllAvailableWidth();
            Cell totalCell = new Cell()
                    .add(new Paragraph("Total neto a pagar    " + formatCOP(totalNeto) + " COP")
                            .setFont(bold).setFontSize(14).setFontColor(ColorConstants.WHITE).setTextAlignment(TextAlignment.CENTER))
                    .setBackgroundColor(PURPLE).setBorder(null).setPadding(14);
            totalTable.addCell(totalCell);
            doc.add(totalTable);

            // --- Método de pago ---
            doc.add(new Paragraph("\n"));
            doc.add(new Paragraph("Método de pago: " + (pago.getMetodoPago() != null ? pago.getMetodoPago() : "—"))
                    .setFont(regular).setFontSize(10).setFontColor(new DeviceRgb(100, 100, 100)));

            // --- Footer ---
            doc.add(new LineSeparator(new com.itextpdf.kernel.pdf.canvas.draw.SolidLine()).setMarginTop(20));
            doc.add(new Paragraph("NUMA STORE S.A.S. · NIT 901.234.567-1 · Documento generado el "
                    + java.time.LocalDate.now().format(DATE_FMT))
                    .setFont(regular).setFontSize(8).setFontColor(new DeviceRgb(150, 150, 150))
                    .setTextAlignment(TextAlignment.CENTER));

            doc.close();

            String fileName = "comprobante-nomina-" + pagoId + ".pdf";
            return new FacturaNominaDto(baos.toByteArray(), fileName);

        } catch (Exception e) {
            throw new RuntimeException("Error generando PDF: " + e.getMessage(), e);
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private String formatCOP(long valor) {
        NumberFormat nf = NumberFormat.getCurrencyInstance(LOCALE_CO);
        nf.setMaximumFractionDigits(0);
        return nf.format(valor);
    }

    private void addDatoCell(Table t, String label, String value, PdfFont bold, PdfFont regular) {
        t.addCell(new Cell().add(new Paragraph(label).setFont(bold).setFontSize(8))
                .add(new Paragraph(value).setFont(regular).setFontSize(10)).setBorder(null).setPadding(6));
    }

    private void addTableHeader(Table t, String c1, String c2, String c3, PdfFont bold, DeviceRgb bg) {
        for (String h : new String[]{c1, c2, c3}) {
            t.addHeaderCell(new Cell().add(new Paragraph(h).setFont(bold).setFontSize(9))
                    .setBackgroundColor(bg).setBorder(null).setPadding(4));
        }
    }

    private void addTableHeader2(Table t, String c1, String c2, PdfFont bold, DeviceRgb bg) {
        for (String h : new String[]{c1, c2}) {
            t.addHeaderCell(new Cell().add(new Paragraph(h).setFont(bold).setFontSize(9))
                    .setBackgroundColor(bg).setBorder(null).setPadding(4));
        }
    }

    private void addTableRow(Table t, String concepto, String base, String valor, PdfFont regular) {
        t.addCell(new Cell().add(new Paragraph(concepto).setFont(regular).setFontSize(9)).setBorder(null).setPadding(3));
        t.addCell(new Cell().add(new Paragraph(base).setFont(regular).setFontSize(9)).setBorder(null).setPadding(3));
        t.addCell(new Cell().add(new Paragraph(valor).setFont(regular).setFontSize(9)).setBorder(null).setPadding(3));
    }

    private void addTableRow2(Table t, String concepto, String valor, PdfFont regular) {
        t.addCell(new Cell().add(new Paragraph(concepto).setFont(regular).setFontSize(9)).setBorder(null).setPadding(3));
        t.addCell(new Cell().add(new Paragraph(valor).setFont(regular).setFontSize(9)).setBorder(null).setPadding(3));
    }

    private void addTotalRow(Table t, String label, String valor, PdfFont bold) {
        t.addCell(new Cell(1, 2).add(new Paragraph(label).setFont(bold).setFontSize(10))
                .setBackgroundColor(new DeviceRgb(230, 230, 230)).setBorder(null).setPadding(4));
        t.addCell(new Cell().add(new Paragraph(valor).setFont(bold).setFontSize(10))
                .setBackgroundColor(new DeviceRgb(230, 230, 230)).setBorder(null).setPadding(4));
    }

    private void addTotalRow2(Table t, String label, String valor, PdfFont bold, DeviceRgb color) {
        t.addCell(new Cell().add(new Paragraph(label).setFont(bold).setFontSize(10).setFontColor(color))
                .setBackgroundColor(new DeviceRgb(252, 228, 228)).setBorder(null).setPadding(4));
        t.addCell(new Cell().add(new Paragraph(valor).setFont(bold).setFontSize(10).setFontColor(color))
                .setBackgroundColor(new DeviceRgb(252, 228, 228)).setBorder(null).setPadding(4));
    }
}
