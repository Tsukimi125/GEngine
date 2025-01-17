import { TextureFormat, TextureUsage } from "../core/WebGPUConstant";
import Geometry from "../geometry/Geometry";
import ShaderMaterial from "../material/ShaderMaterial";
import { Mesh } from "../mesh/Mesh";
import Attachment from "../render/Attachment";
import { Float32Attribute } from "../render/Attribute";
import Context from "../render/Context";
import RenderTarget from "../render/RenderTarget";
import Sampler from "../render/Sampler";
import Texture from "../render/Texture";
import getVertFrag from "../shader/Shaders";
export default class ResolveFrame {
	canvasRenderTarget: RenderTarget;
	material: ShaderMaterial;
	geometry: Geometry;
	quadMesh: Mesh;
	constructor() {
		this.geometry = new Geometry({});
		this.geometry.setAttribute(
			new Float32Attribute("position", [-1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0], 2)
		);
		this.geometry.count = 6;
		const shader = getVertFrag("resolve", {});
		this.material = new ShaderMaterial({
			type: "resolve",
			frag: shader.frag,
			vert: shader.vert,
			uniforms: {
				texture: {
					type: "texture",
					value: undefined
				},
				sampler: {
					type: "sampler",
					value: new Sampler({
						magFilter: "linear",
						minFilter: "linear"
					})
				}
			}
		});
		this.quadMesh = new Mesh(this.geometry, this.material);
	}
	render(context: Context, colorTexture?: Texture) {
		if (!this.canvasRenderTarget) this.initRenderTarget(context);
		// this.material
		this.material.uniforms.texture.value = colorTexture;
		//@ts-ignore
		this.canvasRenderTarget.colorAttachments[0].texture = {
			textureView: context.context.getCurrentTexture().createView()
		};
		this.material.dirty = true;
		this.material.update(undefined, this.quadMesh);

		const drawComand = this.quadMesh.getDrawCommand();

		const currentRenderPassEncoder = this.canvasRenderTarget.beginRenderPassEncoder(context);

		context.render(drawComand, currentRenderPassEncoder);

		this.canvasRenderTarget.endRenderPassEncoder();
	}
	private initRenderTarget(context: Context) {
		const { width, height, depth } = context.presentationSize;
		const colorAttachment = new Attachment(
			{ r: 0.0, g: 0.0, b: 0.0, a: 0 },
			{
				//@ts-ignore
				texture: {
					textureView: undefined
				}
			}
		);
		const depthTexture = new Texture({
			label: "resolveDepth",
			size: { width, height, depth },
			format: TextureFormat.Depth24Plus,
			usage: TextureUsage.RenderAttachment
		});
		const depthAttachment = new Attachment(1.0, { texture: depthTexture });
		this.canvasRenderTarget = new RenderTarget("render", [colorAttachment], depthAttachment);
	}
}
