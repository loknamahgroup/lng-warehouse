package com.branchstock.service;

import com.branchstock.dto.StockRequestDto;
import com.branchstock.dto.StockRequestLineDto;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.Instant;
import java.util.List;

/** Builds the downloadable .xlsx "approval copy" for a stock request. */
@Service
public class ApprovalCopyService {

    private static final String[] HEADERS =
            {"#", "Product", "SKU", "Unit", "Requested Qty", "Approved Qty", "Status", "Notes"};

    public byte[] generateApprovalCopy(StockRequestDto request) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Approval Copy");

            Font bold = workbook.createFont();
            bold.setBold(true);

            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFont(bold);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            CellStyle approvedStyle = fill(workbook, IndexedColors.LIGHT_GREEN);
            CellStyle rejectedStyle = fill(workbook, IndexedColors.ROSE);
            CellStyle pendingStyle = fill(workbook, IndexedColors.LIGHT_YELLOW);

            CellStyle boldStyle = workbook.createCellStyle();
            boldStyle.setFont(bold);

            Row header = sheet.createRow(0);
            for (int i = 0; i < HEADERS.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(HEADERS[i]);
                cell.setCellStyle(headerStyle);
            }

            List<StockRequestLineDto> lines = request.lines();
            int totalRequested = 0;
            int totalApproved = 0;
            int rowNum = 1;
            for (int i = 0; i < lines.size(); i++) {
                StockRequestLineDto line = lines.get(i);
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(i + 1);
                row.createCell(1).setCellValue(nullToEmpty(line.productName()));
                row.createCell(2).setCellValue(nullToEmpty(line.sku()));
                row.createCell(3).setCellValue(nullToEmpty(line.unit()));
                row.createCell(4).setCellValue(line.requestedQuantity());
                row.createCell(5).setCellValue(line.approvedQuantity());

                String status = line.lineStatus() != null ? line.lineStatus().name() : "PENDING";
                Cell statusCell = row.createCell(6);
                statusCell.setCellValue(status);
                statusCell.setCellStyle(switch (status) {
                    case "APPROVED" -> approvedStyle;
                    case "REJECTED" -> rejectedStyle;
                    default -> pendingStyle;
                });
                row.createCell(7).setCellValue(nullToEmpty(line.notes()));

                totalRequested += line.requestedQuantity();
                totalApproved += line.approvedQuantity();
            }

            Row totals = sheet.createRow(rowNum++);
            Cell label = totals.createCell(0);
            label.setCellValue("Total");
            label.setCellStyle(boldStyle);
            Cell requested = totals.createCell(4);
            requested.setCellValue(totalRequested);
            requested.setCellStyle(boldStyle);
            Cell approved = totals.createCell(5);
            approved.setCellValue(totalApproved);
            approved.setCellStyle(boldStyle);

            Row meta = sheet.createRow(rowNum + 1);
            meta.createCell(0).setCellValue("Branch:");
            meta.createCell(1).setCellValue(nullToEmpty(request.branchName()));
            Row generated = sheet.createRow(rowNum + 2);
            generated.createCell(0).setCellValue("Generated at:");
            generated.createCell(1).setCellValue(Instant.now().toString());

            for (int i = 0; i < HEADERS.length; i++) {
                sheet.autoSizeColumn(i);
            }
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to generate approval copy", e);
        }
    }

    private static CellStyle fill(Workbook workbook, IndexedColors color) {
        CellStyle style = workbook.createCellStyle();
        style.setFillForegroundColor(color.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        return style;
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }
}
