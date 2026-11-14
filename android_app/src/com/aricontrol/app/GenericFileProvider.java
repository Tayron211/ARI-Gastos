package com.aricontrol.app;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import java.io.File;
import java.io.FileNotFoundException;

public class GenericFileProvider extends ContentProvider {
    public static final String AUTHORITY = "com.aricontrol.app.fileprovider";

    @Override
    public boolean onCreate() {
        return true;
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection, String[] selectionArgs, String sortOrder) {
        File file = getFileForUri(uri);
        if (file == null || !file.exists()) return null;

        String[] cols = projection != null ? projection : new String[]{
            OpenableColumns.DISPLAY_NAME,
            OpenableColumns.SIZE
        };

        MatrixCursor cursor = new MatrixCursor(cols, 1);
        MatrixCursor.RowBuilder row = cursor.newRow();
        for (String col : cols) {
            if (OpenableColumns.DISPLAY_NAME.equals(col)) {
                row.add(file.getName());
            } else if (OpenableColumns.SIZE.equals(col)) {
                row.add(file.length());
            } else {
                row.add(null);
            }
        }
        return cursor;
    }

    @Override
    public String getType(Uri uri) {
        return "application/vnd.android.package-archive";
    }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        File file = getFileForUri(uri);
        if (file == null || !file.exists()) {
            throw new FileNotFoundException("File not found: " + uri);
        }
        return ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY);
    }

    @Override
    public Uri insert(Uri uri, ContentValues values) {
        return null;
    }

    @Override
    public int delete(Uri uri, String selection, String[] selectionArgs) {
        File file = getFileForUri(uri);
        if (file != null && file.exists()) {
            return file.delete() ? 1 : 0;
        }
        return 0;
    }

    @Override
    public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) {
        return 0;
    }

    private File getFileForUri(Uri uri) {
        if (uri == null) return null;
        String name = uri.getLastPathSegment();
        if (name == null) return null;
        File baseDir = getContext().getExternalFilesDir(null);
        if (baseDir == null) {
            baseDir = getContext().getFilesDir();
        }
        File updatesDir = new File(baseDir, "updates");
        File file = new File(updatesDir, name);
        if (file.exists()) return file;
        return new File(baseDir, name);
    }

    public static Uri getUriForFile(android.content.Context context, File file) {
        return Uri.parse("content://" + AUTHORITY + "/" + file.getName());
    }
}