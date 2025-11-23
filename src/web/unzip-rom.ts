const MAX_FILE_SIZE = 16 * 1024 * 1024;

interface EOCDRecord {
    readonly entries: number;
    readonly cdSize: number;
    readonly cdOffset: number;
}

interface CDFileHeader {
    readonly compressionMethod: number;
    readonly compressedSize: number;
    readonly localOffset: number;
}

const enum EOCDOffsets {
    Signature = 0,
    DiskNumber = 4,
    DiskWithCd = 6,
    EntriesThisDisk = 8,
    EntriesTotal = 10,
    CdSize = 12,
    CdOffset = 16,
    CommentLength = 20,
    Comment = 22,
}

const enum CDFHOffsets {
    Signature = 0,
    VersionMadeBy = 4,
    VersionNeeded = 6,
    BitFlag = 8,
    CompressionMethod = 10,
    ModTime = 12,
    ModDate = 14,
    Crc32 = 16,
    CompressedSize = 20,
    UncompressedSize = 24,
    FilenameLength = 28,
    ExtraLength = 30,
    CommentLength = 32,
    DiskStart = 34,
    InternalAttrs = 36,
    ExternalAttrs = 38,
    LocalOffset = 42,
    Filename = 46
}

const enum LFHOffsets {
    Signature = 0,
    VersionNeeded = 4,
    BitFlag = 6,
    CompressionMethod = 8,
    ModTime = 10,
    ModDate = 12,
    Crc32 = 14,
    CompressedSize = 18,
    UncompressedSize = 22,
    FilenameLength = 26,
    ExtraLength = 28,
    Filename = 30,
}

const enum Signatures {
    EOCD = 0x06054b50,
    CDFH = 0x02014b50,
    LFH = 0x04034b50,
}

const enum Sizes {
    SmallestEOCD = 22,
    LargestEOCD = 22 + 65_535,
    SmallestCDFH = 46,
    SmallestLFH = 30,
}

class StructView {
    private static textDecoder: TextDecoder = new TextDecoder("utf-8");

    constructor(
        private view: DataView,
        private base = 0
    ) {}

    u16(offset: number) {
        return this.view.getUint16(this.base + offset, true);
    }

    u32(offset: number) {
        return this.view.getUint32(this.base + offset, true);
    }

    string(offset: number, length: number) {
        const actualOffset = this.view.byteOffset + this.base + offset;
        const slice = new Uint8Array(this.view.buffer, actualOffset, length);
        return StructView.textDecoder.decode(slice);
    }
}

async function getEOCD(blob: Blob): Promise<EOCDRecord> {
    const start = Math.max(0, blob.size - Sizes.LargestEOCD);
    const buffer = await blob.slice(start).arrayBuffer();
    const view = new DataView(buffer);
    const firstCheck = view.byteLength - Sizes.SmallestEOCD;

    for (let i = firstCheck; i >= 0; --i) {
        const sv = new StructView(view, i);
        if (sv.u32(EOCDOffsets.Signature) !== Signatures.EOCD) {
            continue;
        }

        return {
            entries: sv.u16(EOCDOffsets.EntriesTotal),
            cdSize: sv.u32(EOCDOffsets.CdSize),
            cdOffset: sv.u32(EOCDOffsets.CdOffset),
        };
    }
    throw new Error("Could not find EOCD");
}

async function findCDEntry(blob: Blob, eocd: EOCDRecord, ext: string[]) {
    const buffer = await blob.slice(eocd.cdOffset, eocd.cdOffset + eocd.cdSize).arrayBuffer();
    const view = new DataView(buffer);
    const cdEnd = view.byteLength;
    let cdOffset = 0;

    for (let i = 0; i < eocd.entries && cdOffset < cdEnd; i++) {
        const sv = new StructView(view, cdOffset);
        if (sv.u32(CDFHOffsets.Signature) !== Signatures.CDFH) {
            console.warn(`CDFH at ${cdOffset} has an invalid signature`);
            break;
        }

        const extraLength = sv.u16(CDFHOffsets.ExtraLength);
        const commentLength = sv.u16(CDFHOffsets.CommentLength);
        const fileNameLength = sv.u16(CDFHOffsets.FilenameLength);
        const nextOffset = cdOffset + Sizes.SmallestCDFH + fileNameLength + extraLength + commentLength;

        const filename = sv.string(CDFHOffsets.Filename, fileNameLength);
        if (!ext.some(x => filename?.endsWith(x))) {
            // not the file we're looking for
            cdOffset = nextOffset;
            continue;
        }

        return {
            compressionMethod: sv.u16(CDFHOffsets.CompressionMethod),
            compressedSize: sv.u32(CDFHOffsets.CompressedSize),
            localOffset: sv.u32(CDFHOffsets.LocalOffset)
        };
    }

    return null;
}

async function getDataOffset(blob: Blob, entry: CDFileHeader) {
    const buffer = await blob.slice(entry.localOffset, entry.localOffset + Sizes.SmallestLFH).arrayBuffer();
    const view = new DataView(buffer);
    const sv = new StructView(view);

    if (sv.u32(LFHOffsets.Signature) !== Signatures.LFH) {
        throw new Error(`Invalid LFH signature`);
    }

    const filenameLength = sv.u16(LFHOffsets.FilenameLength);
    const extraLength = sv.u16(LFHOffsets.ExtraLength);

    return entry.localOffset + Sizes.SmallestLFH + filenameLength + extraLength;
}

export default async function unzipRom(blob: Blob) {
    if (blob.size >= MAX_FILE_SIZE) {
        throw new Error("File is too large");
    }

    const eocd = await getEOCD(blob);
    const entry = await findCDEntry(blob, eocd, [".gb", ".gbc"]);
    if (!entry) {
        throw new Error("Could not find ROM inside archive");
    }

    const start = await getDataOffset(blob, entry);
    const end = start + entry.compressedSize;
    let stream = blob.slice(start, end).stream();

    if (entry.compressionMethod === 8) {
        const ds = new DecompressionStream("deflate-raw");
        stream = stream.pipeThrough(ds);
    } else if (entry.compressionMethod !== 0) {
        throw new Error(`Unsupported compression method ${entry.compressionMethod}`);
    }

    const response = new Response(stream);
    return await response.arrayBuffer();
}
