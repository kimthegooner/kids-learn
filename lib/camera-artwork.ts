import { CAMERA_FILTERS, type FilterId } from "./camera";

export type CameraSprite = { image: HTMLImageElement; x: number; y: number; width: number; height: number; rowWidths?: number[] };
export type CameraArtwork = Partial<Record<FilterId, CameraSprite>>;
export const ARTWORK_VERSION = "v2";
const IDS = CAMERA_FILTERS.map((filter) => filter.id);

export function artworkUrl(id: FilterId, base = "") {
  return `${base}/camera/artwork/${id}-${ARTWORK_VERSION}.png`;
}

let loading: Promise<CameraArtwork> | null = null;
export function loadCameraArtwork(base = ""): Promise<CameraArtwork> {
  if (loading) return loading;
  loading = Promise.all(IDS.map(async (id) => {
    const image = new Image();
    image.src = artworkUrl(id, base);
    try { await image.decode(); } catch { return null; }
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true })!;
    context.drawImage(image,0,0);
    const pixels = context.getImageData(0,0,canvas.width,canvas.height).data;
    let left=canvas.width, top=canvas.height, right=0, bottom=0;
    const rowLeft=Array<number>(canvas.height).fill(canvas.width);
    const rowRight=Array<number>(canvas.height).fill(0);
    // Measure visible sprite bounds once. The original transparent PNG is unchanged.
    for(let y=0;y<canvas.height;y++) for(let x=0;x<canvas.width;x++) {
      if(pixels[(y*canvas.width+x)*4+3]<32) continue;
      left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
      rowLeft[y]=Math.min(rowLeft[y],x);rowRight[y]=Math.max(rowRight[y],x);
    }
    if(right<=left || bottom<=top) return null;
    return [id,{image,x:left,y:top,width:right-left+1,height:bottom-top+1,rowWidths:rowLeft.map((l,i)=>Math.max(1,rowRight[i]-l+1))}] as const;
  })).then((items) => Object.fromEntries(items.filter((item) => item !== null)) as CameraArtwork);
  return loading;
}
