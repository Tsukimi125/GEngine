import Attachment from "../render/Attachment";
import Context from "../render/Context";
import Pass from "./Pass";
import RenderTarget from "../render/RenderTarget";
import DrawCommand from "../render/DrawCommand";
import RenderQueue from "../core/RenderQueue";
import { TextureFormat, TextureUsage } from "../core/WebGPUConstant";
import Texture from "../render/Texture";
import Camera from "../camera/Camera";
import { Light } from "../light/Light";
import { BaseShadow } from "../light/shadows/BaseShadow";
import { FrameState } from "../core/FrameState";
import ShaderMaterial from "../material/ShaderMaterial";
import getVertFrag from "../shader/Shaders";
import ShaderData from "../render/ShaderData";
import UniformBuffer from "../render/UniformBuffer";

export class ShadowPass extends Pass {
	public shadowMaterial: ShaderMaterial;
	constructor(context: Context) {
		super(context);
		this.init(context);
	}

	beforeRender(): void {
		return;
	}

	render(frameState: FrameState, camera?: Camera) {
		const { renderQueue, context } = frameState;
		const lights = context.lightManger.getAllLights();
		if (lights.length === 0) return;

		for (let i = 0; i < lights.length; i++) {
			const light = lights[i];
			const shadow = light.shadow;
			if (!shadow) continue;
			this.setRenderTarget(shadow);
			super.beforeRender();

			renderQueue.sort();
			// renderQueue.preRender(shadow.camera, this.context, this.passRenderEncoder);
			renderQueue.transparentRender(shadow.camera, this.context, this.passRenderEncoder, this.shadowMaterial);
			renderQueue.opaqueRender(shadow.camera, this.context, this.passRenderEncoder, this.shadowMaterial);
		}
	}

	// afterRender(): void {
	// 	return;
	// }

	private setRenderTarget(shadow: BaseShadow) {
		const shadowMapTexture = shadow.getShadowMapTexture();
		const depthAttachment = new Attachment(1.0, { texture: shadowMapTexture });
		this.renderTarget.depthAttachment = depthAttachment;
	}

	private init(context: Context) {
		this.createRenderTarget(context);
		this.createShadowMaterial();
	}
	private createRenderTarget(context: Context) {
		this.renderTarget = new RenderTarget("render", []);
	}

	private createShadowMaterial() {
		const colorShader = getVertFrag("color");
		this.shadowMaterial = new ShaderMaterial({
			type: "shadowMaterial",
			uniforms: {},
			vert: colorShader.vert,
			frag: undefined
		});
		this.shadowMaterial.light = true;
		this.shadowMaterial.shaderData = new ShaderData(this.shadowMaterial.type, 0);
		const uniformBuffer = new UniformBuffer();
		uniformBuffer.setMatrix4("modelMatrix", () => {
			return null;
		});

		this.shadowMaterial.shaderData.setUniformBuffer("shadowUniformStruct", uniformBuffer);
	}
}
